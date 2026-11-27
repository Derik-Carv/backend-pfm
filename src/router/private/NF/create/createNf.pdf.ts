import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { buildSafeNfArchivePath } from "@/lib/archivePath";
import type { NfCreateInput } from "../nf.schemas";

export const MAX_NF_PDF_BYTES = 10 * 1024 * 1024;
const MAX_NF_PDF_PAGES = 20;
const PDF_PARSE_TIMEOUT_MS = 10_000;
const PDF_MAGIC = Buffer.from("%PDF-", "ascii");

type NfPdfField = "numberNf" | "acessKey" | "emissionDate" | "totalValue";

export function assertValidPdfBuffer(buffer: Buffer): void {
    if (buffer.length === 0) {
        throw new Error("EMPTY_FILE");
    }
    if (buffer.length > MAX_NF_PDF_BYTES) {
        throw new Error("PDF_FILE_TOO_LARGE");
    }
    if (buffer.length < PDF_MAGIC.length || !buffer.subarray(0, 5).equals(PDF_MAGIC)) {
        throw new Error("INVALID_FILE_TYPE");
    }
}

export class NfPdfInconsistencyError extends Error {
    constructor(
        public readonly inconsistencies: Array<{
            field: NfPdfField;
            sentValue: string | number;
            pdfValue: string | number | null;
        }>,
    ) {
        super("NF_PDF_INCONSISTENT");
    }
}

function extractTextValue(text: string, label: string, pattern: RegExp) {
    const labelIndex = text.indexOf(label);
    if (labelIndex < 0) return null;

    return text.slice(labelIndex + label.length).match(pattern)?.[1] ?? null;
}

function normalizePdfDate(value: string) {
    const match = value.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    return match ? `${match[3]}-${match[2]}-${match[1]}` : value;
}

function normalizePdfMoney(value: string) {
    return Number(value.replace(/\./g, "").replace(",", "."));
}

export function resolvePdfWorkerSrc(): string {
    const candidates = [
        path.join(process.cwd(), "dist/pdf.worker.min.mjs"),
        path.join(
            process.cwd(),
            "node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs",
        ),
        path.join(
            process.cwd(),
            "node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
        ),
    ];
    const resolved = candidates.find((candidate) => existsSync(candidate)) ?? candidates[2];
    return pathToFileURL(resolved).href;
}

export async function validateNfPdf(file: File, data: NfCreateInput) {
    const rawBuffer = Buffer.from(await file.arrayBuffer());
    assertValidPdfBuffer(rawBuffer);

    pdfjs.GlobalWorkerOptions.workerSrc = resolvePdfWorkerSrc();
    const loadingTask = pdfjs.getDocument({
        data: new Uint8Array(rawBuffer),
        useWorkerFetch: false,
        disableFontFace: true,
    });

    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
    try {
        const parsePromise = (async () => {
            const pdf = await loadingTask.promise;
            if (pdf.numPages > MAX_NF_PDF_PAGES) {
                throw new Error("PDF_PAGE_LIMIT_EXCEEDED");
            }

            const pageTexts: string[] = [];

            for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
                const page = await pdf.getPage(pageNumber);
                const content = await page.getTextContent();
                pageTexts.push(
                    content.items
                        .map((item) =>
                            "str" in item && typeof item.str === "string"
                                ? item.str
                                : "",
                        )
                        .filter(Boolean)
                        .join(" "),
                );
            }

            return pageTexts.join(" ").replace(/\s+/g, " ").trim();
        })();

        const timeoutPromise = new Promise<never>((_, reject) => {
            timeoutHandle = setTimeout(() => {
                void loadingTask.destroy();
                reject(new Error("PDF_PARSE_TIMEOUT"));
            }, PDF_PARSE_TIMEOUT_MS);
        });

        const text = await Promise.race([parsePromise, timeoutPromise]);

        if (!text) {
            throw new Error("PDF_TEXT_NOT_FOUND");
        }

        const pdfValues = {
            numberNf: extractTextValue(text, "NÚMERO DA NFS-e", /\s*(\d+)/),
            acessKey: extractTextValue(
                text,
                "CHAVE DE ACESSO DA NFS-e",
                /\s*(\d{44,50})(?!\d)/,
            ),
            emissionDate: normalizePdfDate(
                extractTextValue(
                    text,
                    "DATA E HORA DA EMISSÃO DA NFS-e",
                    /\s*(\d{2}\/\d{2}\/\d{4})/,
                ) ?? "",
            ),
            totalValue: normalizePdfMoney(
                extractTextValue(
                    text,
                    "VALOR TOTAL DA NFS-e VALOR DA OPERAÇÃO / SERVIÇO",
                    /R\$\s*([\d.,]+)/,
                ) ?? "NaN",
            ),
        };

        const inconsistencies = (
            Object.keys(pdfValues) as NfPdfField[]
        ).flatMap((field) => {
            const pdfValue = pdfValues[field];
            const sentValue = data[field];

            if (
                pdfValue === null ||
                (typeof pdfValue === "number" && Number.isNaN(pdfValue)) ||
                String(sentValue) !== String(pdfValue)
            ) {
                return [{ field, sentValue, pdfValue }];
            }

            return [];
        });

        if (inconsistencies.length > 0) {
            throw new NfPdfInconsistencyError(inconsistencies);
        }
    } finally {
        if (timeoutHandle) {
            clearTimeout(timeoutHandle);
        }
        await loadingTask.destroy().catch(() => {});
    }
}

export async function updateNfPdf(
    file: File,
    companyId: string,
    typeName: string,
    acessKey: string,
) {
    const buffer = Buffer.from(await file.arrayBuffer());
    assertValidPdfBuffer(buffer);

    const { absoluteDir, absolutePath, relativePath } = buildSafeNfArchivePath(
        companyId,
        typeName,
        acessKey,
    );

    await fs.mkdir(absoluteDir, { recursive: true });
    await fs.writeFile(absolutePath, buffer);
    return relativePath;
}

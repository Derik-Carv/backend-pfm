import fs from "node:fs/promises";
import path from "node:path";
import { PDFParse } from "pdf-parse";
import type { NfCreateInput } from "../nf.schemas";

type NfPdfField = "numberNf" | "acessKey" | "emissionDate" | "totalValue";

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

export async function validateNfPdf(file: File, data: NfCreateInput) {
    const parser = new PDFParse({
        data: await file.arrayBuffer(),
    });

    try {
        const result = await parser.getText();
        const text = result.text.replace(/\s+/g, " ").trim();

        if (!text) {
            throw new Error("PDF_TEXT_NOT_FOUND");
        }

        const pdfValues = {
            numberNf: extractTextValue(
                text,
                "NÚMERO DA NFS-e",
                /\s*(\d+)/,
            ),
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
        await parser.destroy();
    }
}

export async function updateNfPdf(file: File, typeName: string) {
    const folderName = typeName
        .trim()
        .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "_")
        .replace(/\s+/g, "_");

    const fileRepository = path.join(
        process.cwd(),
        "archives",
        folderName,
    );

    await fs.mkdir(fileRepository, { recursive: true });

    const fileName = `${crypto.randomUUID()}.pdf`;
    const filePath = path.join(fileRepository, fileName);

    await fs.writeFile(filePath, Buffer.from(await file.arrayBuffer()));

    return path.join("archives", folderName, fileName);
}

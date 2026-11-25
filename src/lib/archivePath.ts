import fs from "node:fs/promises";
import path from "node:path";
import { isValidUuid } from "@/lib/tenant";

export const ARCHIVE_ROOT = path.resolve(process.cwd(), "archives");

export function resolveSafeArchivePath(relativeOrStoredPath: string): string {
    const trimmed = relativeOrStoredPath.trim();
    if (!trimmed) {
        throw new Error("INVALID_ARCHIVE_PATH");
    }

    const resolved = path.resolve(process.cwd(), trimmed);
    if (!resolved.startsWith(`${ARCHIVE_ROOT}${path.sep}`)) {
        throw new Error("INVALID_ARCHIVE_PATH");
    }

    return resolved;
}

export async function verifyRealArchivePath(filePath: string): Promise<string> {
    const realRoot = await fs.realpath(ARCHIVE_ROOT);
    const realTarget = await fs.realpath(filePath);
    if (!realTarget.startsWith(`${realRoot}${path.sep}`)) {
        throw new Error("INVALID_ARCHIVE_PATH");
    }
    return realTarget;
}

export function buildSafeNfArchivePath(
    companyId: string,
    typeName: string,
    acessKeyOrId: string,
): {
    absoluteDir: string;
    absolutePath: string;
    relativePath: string;
} {
    if (!isValidUuid(companyId)) {
        throw new Error("INVALID_TENANT_FOR_ARCHIVE");
    }

    const folderName =
        typeName
            .trim()
            .replace(/[^a-zA-Z0-9_-]+/g, "_")
            .replace(/^_+|_+$/g, "") || "geral";

    const fileKey = acessKeyOrId.trim().replace(/[^a-zA-Z0-9_-]/g, "");
    if (!fileKey) {
        throw new Error("INVALID_ARCHIVE_KEY");
    }

    const absoluteDir = path.resolve(ARCHIVE_ROOT, companyId, folderName);
    const absolutePath = path.resolve(absoluteDir, `${fileKey}.pdf`);

    if (!absolutePath.startsWith(`${ARCHIVE_ROOT}${path.sep}`)) {
        throw new Error("INVALID_ARCHIVE_PATH");
    }

    return {
        absoluteDir,
        absolutePath,
        relativePath: path.relative(process.cwd(), absolutePath),
    };
}

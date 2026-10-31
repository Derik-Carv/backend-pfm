import fs from "node:fs/promises";
import path from "node:path";

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

import fs from "node:fs/promises";
import path from "node:path";
import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { NfRepository } from "@/database/tables/nf/nf.repository";

const nfFileParamsSchema = z.object({
    id: z.string().uuid(),
});

const nfFileQuerySchema = z.object({
    download: z.coerce.boolean().default(false),
});

const nfRepository = new NfRepository();

export async function getNfFileController(
    request: FastifyRequest,
    reply: FastifyReply,
) {
    try {
        const { id } = nfFileParamsSchema.parse(request.params);
        const { download } = nfFileQuerySchema.parse(request.query);
        const note = await nfRepository.findId(id);

        if (!note || !note.pathFile) {
            return reply.status(404).send({ message: "NF file not found" });
        }

        const archiveRoot = path.resolve(process.cwd(), "archives");
        const filePath = path.resolve(process.cwd(), note.pathFile);
        if (!filePath.startsWith(`${archiveRoot}${path.sep}`)) {
            request.log.warn({ noteId: id }, "Rejected NF file path outside archive");
            return reply.status(404).send({ message: "NF file not found" });
        }

        const file = await fs.readFile(filePath);
        const fileName = path.basename(filePath).replace(/["\\\r\n]/g, "_");
        reply.header("Content-Type", "application/pdf");
        reply.header(
            "Content-Disposition",
            `${download ? "attachment" : "inline"}; filename="${fileName}"`,
        );
        reply.header("Cache-Control", "private, no-store");
        return reply.send(file);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return reply.status(400).send({ message: "Invalid NF file request" });
        }

        if (error instanceof Error && "code" in error && error.code === "ENOENT") {
            return reply.status(404).send({ message: "NF file not found" });
        }

        request.log.error({ err: error }, "Error while reading NF file");
        return reply.status(500).send({ message: "Error while reading NF file" });
    }
}

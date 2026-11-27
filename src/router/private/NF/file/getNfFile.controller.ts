import { createReadStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { NfRepository } from "@/database/tables/nf/nf.repository";
import { resolveSafeArchivePath, verifyRealArchivePath } from "@/lib/archivePath";
import { hasTenantAccess } from "@/lib/tenant";

const nfFileParamsSchema = z.object({
    id: z.string().uuid(),
});

const nfFileQuerySchema = z.object({
    download: z
        .enum(["true", "false"])
        .optional()
        .transform((value) => value === "true"),
});

const nfRepository = new NfRepository();

export async function getNfFileController(
    request: FastifyRequest,
    reply: FastifyReply,
) {
    try {
        const { id } = nfFileParamsSchema.parse(request.params);
        const { download } = nfFileQuerySchema.parse(request.query);
        const accessibleCompanyIds = request.tenant?.accessibleCompanyIds;
        const note = await nfRepository.findId(id);

        if (
            !note ||
            !note.pathFile ||
            !hasTenantAccess(note.companyId, accessibleCompanyIds)
        ) {
            return reply.status(404).send({ message: "NF file not found" });
        }

        let filePath: string;
        try {
            const candidate = resolveSafeArchivePath(note.pathFile);
            filePath = await verifyRealArchivePath(candidate);
        } catch (err) {
            if (err instanceof Error && "code" in err && err.code === "ENOENT") {
                return reply.status(404).send({ message: "NF file not found" });
            }
            request.log.warn({ noteId: id }, "Rejected NF file path outside archive");
            return reply.status(404).send({ message: "NF file not found" });
        }

        const stat = await fs.stat(filePath);
        if (!stat.isFile()) {
            return reply.status(404).send({ message: "NF file not found" });
        }

        const fileName = path.basename(filePath).replace(/["\\\r\n]/g, "_");
        reply.header("Content-Type", "application/pdf");
        reply.header("Content-Length", String(stat.size));
        reply.header("X-Content-Type-Options", "nosniff");
        reply.header(
            "Content-Disposition",
            `${download ? "attachment" : "inline"}; filename="${fileName}"`,
        );
        reply.header("Cache-Control", "private, no-store");
        return reply.send(createReadStream(filePath));
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

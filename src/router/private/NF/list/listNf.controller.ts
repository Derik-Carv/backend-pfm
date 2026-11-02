import type { FastifyReply, FastifyRequest } from "fastify";
import { NfRepository } from "@/database/tables/nf/nf.repository";
import { nfListQuerySchema, type NfListQuery } from "../nf.schemas";
import { injectListNf } from "./listNf.usecase";

const listNf = injectListNf({ nf: new NfRepository() });

export async function listNfController(
    request: FastifyRequest<{ Querystring: NfListQuery }>,
    reply: FastifyReply,
) {
    try {
        const query = nfListQuerySchema.parse(request.query);
        const result = await listNf(query);

        const archiveRoot = path.resolve(process.cwd(), "archives");
        const notes = await Promise.all(result.list.map(async (note) => {
            if (!note.pathFile) return { ...note, hasFile: false };
            const filePath = path.resolve(process.cwd(), note.pathFile);
            if (!filePath.startsWith(`${archiveRoot}${path.sep}`)) {
                return { ...note, hasFile: false };
            }
            try {
                await fs.access(filePath);
                return { ...note, hasFile: true };
            } catch {
                return { ...note, hasFile: false };
            }
        }));

        return reply.status(200).send({
            message: "Fiscal notes retrieved successfully",
            notes,
            pagination: result.pagination,
        });
    } catch (error) {
        request.log.error({ err: error }, "Error while listing fiscal notes");

        if (error instanceof Error && error.name === "ZodError") {
            return reply.status(400).send({
                message: "Validation error",
                error: error.message,
                statusCode: 400,
            });
        }

        return reply.status(500).send({
            message: "Internal server error while listing fiscal notes",
            statusCode: 500,
        });
    }
}
import fs from "node:fs/promises";
import path from "node:path";

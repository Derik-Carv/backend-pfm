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

        return reply.status(200).send({
            message: "Fiscal notes retrieved successfully",
            notes: result.list,
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

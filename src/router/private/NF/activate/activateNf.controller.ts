import type { FastifyReply, FastifyRequest } from "fastify";
import { NfRepository } from "@/database/tables/nf/nf.repository";
import { nfDeactivateParamsSchema, type NfDeactivateParams } from "../nf.schemas";
import { injectActivateNf } from "./activateNf.usecase";

const activateNf = injectActivateNf({ nf: new NfRepository() });

export async function activateNfController(
    request: FastifyRequest<{ Params: NfDeactivateParams }>,
    reply: FastifyReply,
) {
    try {
        const { id } = nfDeactivateParamsSchema.parse(request.params);
        const note = await activateNf(id);
        return reply.status(200).send({
            message: "Fiscal note activated successfully",
            note,
        });
    } catch (error) {
        request.log.error({ err: error }, "Error while activating fiscal note");

        if (error instanceof Error && error.name === "ZodError") {
            return reply.status(422).send({
                message: "Validation error",
                statusCode: 422,
            });
        }
        if (error instanceof Error && error.message === "NF_NOT_FOUND") {
            return reply.status(404).send({
                message: "Fiscal note not found",
                statusCode: 404,
            });
        }
        if (error instanceof Error && error.message === "NF_ALREADY_ACTIVE") {
            return reply.status(409).send({
                message: "Fiscal note is already active",
                statusCode: 409,
            });
        }

        return reply.status(500).send({
            message: "Internal server error while activating fiscal note",
            statusCode: 500,
        });
    }
}

import type { FastifyReply, FastifyRequest } from "fastify";
import { NfRepository } from "@/database/tables/nf/nf.repository";
import {
    nfDeactivateBodySchema,
    nfDeactivateParamsSchema,
    type NfDeactivateBody,
    type NfDeactivateParams,
} from "../nf.schemas";
import { injectDeactivateNf } from "./deactivateNf.usecase";

const deactivateNf = injectDeactivateNf({ nf: new NfRepository() });

export async function deactivateNfController(
    request: FastifyRequest<{
        Params: NfDeactivateParams;
        Body: NfDeactivateBody;
    }>,
    reply: FastifyReply,
) {
    try {
        const { id } = nfDeactivateParamsSchema.parse(request.params);
        const { reason } = nfDeactivateBodySchema.parse(request.body);
        const note = await deactivateNf(id, reason, request.user.id);

        return reply.status(200).send({
            message: "Fiscal note deactivated successfully",
            note,
        });
    } catch (error) {
        request.log.error({ err: error }, "Error while deactivating fiscal note");

        if (error instanceof Error && error.name === "ZodError") {
            return reply.status(400).send({
                message: "Validation error",
                error: error.message,
                statusCode: 400,
            });
        }
        if (error instanceof Error && error.message === "NF_NOT_FOUND") {
            return reply.status(404).send({
                message: "Fiscal note not found",
                statusCode: 404,
            });
        }
        if (error instanceof Error && error.message === "NF_ALREADY_INACTIVE") {
            return reply.status(409).send({
                message: "Fiscal note is already inactive",
                statusCode: 409,
            });
        }
        if (error instanceof Error && error.message === "NF_ALREADY_CANCELLED") {
            return reply.status(409).send({
                message: "Fiscal note is already cancelled",
                statusCode: 409,
            });
        }

        return reply.status(500).send({
            message: "Internal server error while deactivating fiscal note",
            statusCode: 500,
        });
    }
}

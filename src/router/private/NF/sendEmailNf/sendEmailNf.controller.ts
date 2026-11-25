import type { FastifyRequest, FastifyReply } from "fastify";
import { sendEmailNfSchema, type NfSendEmailInput } from "../nf.schemas";
import { NfRepository } from "@/database/tables/nf/nf.repository";
import { ClientRepository } from "@/database/tables/clients/clients.repository";
import { injejctSendEmailNf } from "./sendEmail.usecase";
import { UsersRepository } from "@/database/tables/users/users.repository";

const usecaseSendEmailNf = injejctSendEmailNf({
    findNf: new NfRepository(),
    clientsDb: new ClientRepository(),
    findUser: new UsersRepository(),
});

export const sendEmailNfController = async (
    request: FastifyRequest<{ Body: NfSendEmailInput }>,
    reply: FastifyReply,
) => {
    try {
        const userId = request.user.id;
        const accessibleCompanyIds = request.tenant?.accessibleCompanyIds;

        const data = sendEmailNfSchema.parse(request.body);

        const sendEmail = await usecaseSendEmailNf(
            userId,
            data,
            accessibleCompanyIds,
        );

        return reply.status(201).send({
            message: "Send nf with email successfully",
            messageId: sendEmail?.messageId,
            accepted: Array.isArray(sendEmail?.accepted)
                ? sendEmail.accepted.map(String)
                : undefined,
        });
    } catch (error: any) {
        request.log.error({ err: error }, "Error while sending NF email");

        if (error.name === "ZodError") {
            return reply.status(400).send({
                message: "Validation error",
                issues: error.errors,
            });
        }

        if (error.message === "NF_FILE_NOT_FOUND") {
            return reply.status(404).send({
                message: "Fiscal note PDF file not found",
            });
        }

        const businessErrors = [
            "NF_NUMBER_INVALID",
            "TYPE_ID_INVALID",
            "VALUE_INVALID",
            "DATE_INVALID",
            "ACESS_KEY_INVALID",
            "CLIENT_ID_INVALID",
            "EMAIL_INVALID",
        ];

        if (businessErrors.includes(error.message)) {
            return reply.status(400).send({
                message: error.message,
            });
        }

        if (
            error.message === "SMTP_NOT_CONFIGURED" ||
            error.message === "EMAIL_SEND_FAILED"
        ) {
            return reply.status(500).send({
                message: "Could not send fiscal note email right now",
            });
        }

        return reply.status(500).send({
            message: "Internal server error while sending fiscal note email",
        });
    }
};

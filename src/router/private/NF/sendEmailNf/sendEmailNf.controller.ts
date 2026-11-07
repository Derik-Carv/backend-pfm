import type { FastifyRequest, FastifyReply } from "fastify";
import { sendEmailNfSchema, type NfSendEmailInput } from "../nf.schemas";
import { NfRepository } from "@/database/tables/nf/nf.repository";
import { ClientRepository } from "@/database/tables/clients/clients.repository";
import { TypeRepository } from "@/database/tables/type/type.repository,";
import { injejctSendEmailNf } from "./sendEmail.usecase";
import { UsersRepository } from "@/database/tables/users/users.repository";

const usecaseSendEmailNf = injejctSendEmailNf({
    findNf: new NfRepository(),
    clientsDb: new ClientRepository(),
    findType: new TypeRepository(),
    findUser: new UsersRepository(),
});

export const sendEmailNfController = async (
    request: FastifyRequest<{ Body: NfSendEmailInput }>,
    reply: FastifyReply,
) => {
    try {
        const userId = request.user.id;

        const data = sendEmailNfSchema.parse(request.body);

        const sendEmail = await usecaseSendEmailNf(userId, data);

        return reply.status(201).send({
            message: "Send nf with email successfully",
            response: sendEmail,
        });
    } catch (error: any) {
        if (error.name === "ZodError") {
            return reply.status(400).send({
                message: "Validation error",
                issues: error.errors,
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

        return reply.status(500).send({
            message: "Internal server error while registering role",
        });
    }
};

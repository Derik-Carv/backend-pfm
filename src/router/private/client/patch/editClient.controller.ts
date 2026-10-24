import type { FastifyReply, FastifyRequest } from "fastify";
import { editClientSchema, type EditClientInput } from "../client.schemas";
import { ClientRepository } from "@/database/tables/clients/clients.repository";
import { UsersRepository } from "@/database/tables/users/users.repository";
import { RoleRepository } from "@/database/tables/roles/roles.repository";
import { createEditClientUseCase } from "./editClient.usecase";

const usecaseEditClient = createEditClientUseCase({
    clientsDb: new ClientRepository(),
    findUser: new UsersRepository(),
    findRole: new RoleRepository(),
});

export const editClientController = async (
    request: FastifyRequest<{ Body: EditClientInput }>,
    reply: FastifyReply,
) => {
    try {
        const data = editClientSchema.parse(request.body);
        const userId = request.user.id;

        const responseClient = await usecaseEditClient(userId, data);

        return reply.status(200).send({
            message: "Client edited with sucess",
            client: responseClient,
        });
    } catch (error: any) {
        if (error.name === "ZodError") {
            return reply.status(400).send({
                message: "Validation error",
                issues: error.errors,
            });
        }

        if (error.message === "INVALID_CPF") {
            return reply.status(400).send({ message: "Invalid CPF" });
        }

        if (error.message === "ID_CLIENT_NOT_DEFINED") {
            return reply.status(400).send({ message: "Client ID is required" });
        }

        if (
            error.message === "USER_NOT_FOUND" ||
            error.message === "ROLE_NOT_FOUND"
        ) {
            return reply
                .status(404)
                .send({ message: "User or role not found" });
        }

        if (error.message === "ROLE_ACESS_DENIED") {
            return reply.status(403).send({
                message: "Access denied",
            });
        }

        if (error.message === "COMPANY_NAME_ALREADY_EXISTS") {
            return reply
                .status(409)
                .send({ message: "Registered Company Name already in use" });
        }
        if (error.message === "TRADE_NAME_ALREADY_EXISTS") {
            return reply
                .status(409)
                .send({ message: "Trade Name already in use" });
        }

        if (error.message === "CPF_ALREADY_EXISTS") {
            return reply.status(409).send({ message: "CPF already in use" });
        }

        if (error.message === "CNPJ_ALREADY_EXISTS") {
            return reply.status(409).send({ message: "CNPJ already in use" });
        }

        return reply.status(500).send({
            message: "Internal server error while registering client",
        });
    }
};

import type { FastifyReply, FastifyRequest } from "fastify";
import { createClientSchema } from "../client.schemas";
import { usecaseCreateClient } from "./createClient.usecase";
import type { CreateClientDatabaseInput } from "@/database/tables/clients/clients.interface";

export const createClientController = async (
    request: FastifyRequest<{ Body: CreateClientDatabaseInput }>,
    reply: FastifyReply,
) => {
    try {
        const data = createClientSchema.parse(request.body);
        const userId = request.user.id;

        const newClient = await usecaseCreateClient(userId, data);

        return reply.status(201).send({
            message: "Client register with sucess",
            client: newClient,
        });
    } catch (error: any) {
        if (error.name === "ZodError") {
            return reply.status(400).send({
                message: "Validation error",
                issues: error.errors,
            });
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

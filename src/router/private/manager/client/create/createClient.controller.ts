import type { FastifyReply, FastifyRequest } from "fastify";
import { createClientSchema } from "@/router/private/manager/client/client.schemas";
import { usecaseCreateClient } from "@/router/private/manager/client/create/createClient.usecase";

export const createClientController = async (
    request: FastifyRequest,
    reply: FastifyReply,
) => {
    try {
        const data = createClientSchema.parse(request);

        const newClient = await usecaseCreateClient(data);

        return reply.status(201).send({
            message: "Client register with sucess",
            clients: newClient,
        });
    } catch (error: any) {
        if (error.name === "ZodError") {
            return reply.status(400).send({
                message: "Validation error",
                issues: error.errors,
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

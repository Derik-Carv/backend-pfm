import type { FastifyReply, FastifyRequest } from "fastify";
import { usecaseAllCLients } from "@/router/private/manager/client/get/getClient.usecase";

export async function getClientsController(
    request: FastifyRequest,
    reply: FastifyReply,
) {
    try {
        const newClients = await usecaseAllCLients();
        return reply.status(200).send({
            message: "Viewer Clients with sucess",
            clients: newClients,
        });
    } catch (error: any) {
        if (error.message === "CLIENTS_NOT_EXISTS") {
            return reply.status(404).send({ message: "Clients not exists" });
        }

        return reply.status(500).send({
            message: "Internal server error while registering client",
        });
    }
}

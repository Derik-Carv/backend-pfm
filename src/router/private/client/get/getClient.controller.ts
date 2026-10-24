import type { FastifyReply, FastifyRequest } from "fastify";
import { injectUseCaseActiveClients } from "./getClient.usecase";
import { paginationQuerySchema } from "@/router/pagination.schema";
import { ClientRepository } from "@/database/tables/clients/clients.repository";

const usecaseAllCLients = injectUseCaseActiveClients({
    clientsDb: new ClientRepository(),
});

export async function getClientsController(
    request: FastifyRequest,
    reply: FastifyReply,
) {
    try {
        const { page, limit } = paginationQuerySchema.parse(request.query);
        const result = await usecaseAllCLients({ page, limit });

        return reply.status(200).send({
            message: "Viewer Clients with sucess",
            clients: result.list,
            pagination: result.pagination,
        });
    } catch (error: any) {
        if (error.name === "ZodError") {
            return reply.status(400).send({
                message: "Validation error",
                issues: error.errors,
            });
        }

        return reply.status(500).send({
            message: "Internal server error while retrieving clients",
        });
    }
}

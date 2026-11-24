import type { FastifyRequest, FastifyReply } from "fastify";
import {
    usecaseGetSystemMetrics,
    usecaseGetCascadeHierarchy,
    usecaseGetClientsByCompany,
} from "./system.usecase";

export async function getSystemMetricsController(
    request: FastifyRequest,
    reply: FastifyReply,
) {
    try {
        const data = await usecaseGetSystemMetrics();
        return reply.status(200).send({
            message: "System metrics retrieved successfully",
            data,
        });
    } catch {
        return reply.status(500).send({ message: "Internal server error" });
    }
}

export async function getCascadeHierarchyController(
    request: FastifyRequest,
    reply: FastifyReply,
) {
    try {
        const mothers = await usecaseGetCascadeHierarchy();
        return reply.status(200).send({
            message: "Cascade hierarchy retrieved successfully",
            mothers,
        });
    } catch {
        return reply.status(500).send({ message: "Internal server error" });
    }
}

export async function getCompanyClientsController(
    request: FastifyRequest<{ Querystring: { companyId: string } }>,
    reply: FastifyReply,
) {
    try {
        const { companyId } = request.query;
        if (!companyId) {
            return reply.status(400).send({ message: "companyId is required" });
        }

        const clients = await usecaseGetClientsByCompany(companyId);
        return reply.status(200).send({
            message: "Clients retrieved successfully",
            clients,
        });
    } catch {
        return reply.status(500).send({ message: "Internal server error" });
    }
}

import type { FastifyRequest, FastifyReply } from "fastify";
import {
    serviceEditBaseSchema,
    type ServiceEditInput,
} from "../myServicesList.schemas";
import { usecaseEditService } from "./editService.usecase";

export const editServicesController = async (
    request: FastifyRequest<{ Body: ServiceEditInput }>,
    reply: FastifyReply,
) => {
    try {
        const userId = request.user.id;
        const params = request.params;
        const data = serviceEditBaseSchema.parse(request.body);

        const editService = await usecaseEditService(userId, params, data);

        return reply.status(201).send({
            message: "Edited service with sucess",
            service: editService,
        });
    } catch (error: any) {
        if (error.name === "ZodError") {
            return reply.status(400).send({
                message: "Validation error",
                issues: error.errors,
            });
        }

        if (error.message === "ROLE_NOT_FOUND") {
            return reply.status(404).send({
                message: "Role not found",
            });
        }

        if (error.message === "STATUS_SERVICE_NOT_FOUND") {
            return reply.status(404).send({
                message: "Status service not found",
            });
        }

        if (error.message === "CLIENT_NOT_FOUND") {
            return reply.status(404).send({
                message: "Client service not found",
            });
        }

        if (error.message === "SERVICE_NOT_FOUND") {
            return reply.status(404).send({
                message: "Service not found",
            });
        }

        if (error.message === "ROLE_ACESS_DENIED") {
            return reply.status(403).send({
                message: "Access denied",
            });
        }

        return reply.status(500).send({
            message: "Internal server error while registering role",
        });
    }
};

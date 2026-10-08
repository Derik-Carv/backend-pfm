import type { FastifyRequest, FastifyReply } from "fastify";
import {
    createServiceInputSchema,
    type CreateServiceInput,
} from "../services.schemas";
import { usecaseCreateService } from "./createServices.usecase";

export const createServicesController = async (
    request: FastifyRequest<{ Body: CreateServiceInput }>,
    reply: FastifyReply,
) => {
    try {
        const userId = request.user.id;
        const data = createServiceInputSchema.parse(request.body);

        const newService = await usecaseCreateService(userId, data);

        return reply.status(201).send({
            message: "Create service with sucess",
            service: newService,
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

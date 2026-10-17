import type { FastifyRequest, FastifyReply } from "fastify";
import { usecaseGetService } from "@/router/private/home/services/get/getServices.usecase";
import { paginationQuerySchema } from "@/router/pagination.schema";

export const getServicesController = async (
    request: FastifyRequest,
    reply: FastifyReply,
) => {
    try {
        const userId = request.user.id;
        const { page, limit } = paginationQuerySchema.parse(request.query);

        const allServices = await usecaseGetService(userId, { page, limit });

        return reply.status(200).send({
            message: "Get services with sucess",
            services: allServices,
        });
    } catch (error: any) {
        if (error.name === "ZodError") {
            return reply.status(400).send({
                message: "Validation error",
                issues: error.errors,
            });
        }

        if (error.message === "SERVICES_NO_DATA") {
            return reply.status(404).send({
                message: "Services not found",
            });
        }

        if (error.message === "SERVICES_DATA_ERROR") {
            return reply.status(404).send({
                message: "Services error data",
            });
        }

        if (error.message === "ROLE_NOT_FOUND") {
            return reply.status(404).send({
                message: "Role not found",
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

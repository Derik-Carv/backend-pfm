import type { FastifyRequest, FastifyReply } from "fastify";
import { usecaseMyServicesList } from "./myServicesList.usecase";

export const getMyServicesListController = async (
    request: FastifyRequest,
    reply: FastifyReply,
) => {
    try {
        const userId = request.user.id;

        const serviceList = await usecaseMyServicesList(userId);

        return reply.status(200).send({
            message: "Get find services list with success",
            myServicesList: serviceList,
        });
    } catch (error: any) {
        if (error.name === "ZodError") {
            return reply.status(400).send({
                message: "Validation error",
                issues: error.errors,
            });
        }

        if (error.message === "SERVICE_NOT_FOUND") {
            return reply.status(404).send({
                message: "Service not found",
            });
        }

        if (error.message === "USER_NOT_FOUND") {
            return reply.status(404).send({
                message: "User not found",
            });
        }

        if (error.message === "ROLE_NOT_FOUND") {
            return reply.status(404).send({
                message: "Role not found",
            });
        }

        if (
            error.message === "ROLE_ACESS_DENIED" ||
            error.message === "USER_ACESS_DENIED"
        ) {
            return reply.status(403).send({
                message: "Access denied",
            });
        }

        return reply.status(500).send({
            message: "Internal server error while retrieving services",
        });
    }
};

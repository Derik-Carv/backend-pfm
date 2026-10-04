import type { FastifyRequest, FastifyReply } from "fastify";
import { usecaseMyServicesHome } from "./dashServiceHome.usecase";

export const getServicesHomeController = async (
    request: FastifyRequest,
    reply: FastifyReply,
) => {
    try {
        const userId = request.user.id;

        const menuData = await usecaseMyServicesHome(userId);

        return reply.status(200).send({
            message: "Get services home overview with success",
            data: menuData,
        });
    } catch (error: any) {
        if (error.name === "ZodError") {
            return reply.status(400).send({
                message: "Validation error",
                issues: error.errors,
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

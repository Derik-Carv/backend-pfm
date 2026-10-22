import type { FastifyRequest, FastifyReply } from "fastify";
import { usecaseGetUser } from "@/router/private/admin/users/get/getUser.usecase";
import { paginationQuerySchema } from "@/router/pagination.schema";

export const getUserController = async (
    request: FastifyRequest,
    reply: FastifyReply,
) => {
    try {
        const { page, limit } = paginationQuerySchema.parse(request.query);

        const users = await usecaseGetUser({ page, limit });

        return reply.status(200).send({
            message: "Users here",
            users: users,
        });
    } catch (error: any) {
        if (error.name === "ZodError") {
            return reply.status(400).send({
                message: "Validation error",
                issues: error.errors,
            });
        }

        if (error.message === "USERS_NO_DATA") {
            return reply.status(404).send({
                message: "Users not found",
            });
        }

        if (error.message === "USERS_DATA_ERROR") {
            return reply.status(500).send({
                message: "Failed to retrieve users",
            });
        }

        return reply.status(500).send({
            message: "Internal server error for find users",
        });
    }
};

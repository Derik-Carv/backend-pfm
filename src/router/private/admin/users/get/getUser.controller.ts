import type { FastifyRequest, FastifyReply } from "fastify";
import { usecaseGetUser } from "@/router/private/admin/users/get/getUser.usecase";
import { getUsersQuerySchema } from "../user.schemas";

export const getUserController = async (
    request: FastifyRequest,
    reply: FastifyReply,
) => {
    try {
        const { page, limit } = getUsersQuerySchema.parse(request.query);

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
            return reply.status(404).send({
                message: "Users error data",
            });
        }

        if (error.message === "USERS_NOT_FOUND") {
            return reply.status(404).send({ message: "Users not found" });
        }
        return reply.status(500).send({
            message: "Internal server error for find users",
        });
    }
};

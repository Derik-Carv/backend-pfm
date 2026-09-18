import { getUsersRepository } from "@/database/users/users.repository";
import type { FastifyRequest, FastifyReply } from "fastify";
import { getUserResponseSchema } from "../user.schemas";
import { usecaseCreateRole } from "@/router/private/admin/role/create/createRole.usecase";
import { usecaseGetUser } from "./getUser.usecase";

export const getUserController = async (
    request: FastifyRequest,
    reply: FastifyReply,
) => {
    try {
        const users = await usecaseGetUser();

        return reply.status(200).send({
            message: "Users here",
            users: users,
        });
    } catch (error: any) {
        request.log.error(error);
        if (error.message === "USERS_NOT_FOUND") {
            return reply.status(404).send({ message: "Users not found" });
        }
        return reply.status(500).send({
            message: "Internal server error for find users",
        });
    }
};

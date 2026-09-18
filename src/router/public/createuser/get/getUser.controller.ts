import type { FastifyRequest, FastifyReply } from "fastify";
import { usecaseGetUser } from "@/router/public/createuser/get/getUser.usecase";

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

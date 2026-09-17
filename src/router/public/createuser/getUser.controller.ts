import { getUsersRepository } from "@/database/users/users.repository";
import type { FastifyRequest, FastifyReply } from "fastify";
import { getUserResponseSchema } from "./user.schemas";

export const getUserController = async (
    request: FastifyRequest,
    reply: FastifyReply,
) => {
    try {
        const users = await getUsersRepository();

        if (users) {
            return reply.status(200).send({
                message: "Users here",
                users: users,
            });
        }

        return reply.status(404).send({ message: "Users not found" });
    } catch (error) {
        request.log.error(error);
        return reply.status(500).send({
            message: "Internal server error for find users",
        });
    }
};

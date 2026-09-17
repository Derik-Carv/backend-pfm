import type { FastifyRequest, FastifyReply } from "fastify";
import { getRolesRepository } from "@/database/users/roles.repository";

export const getRolesController = async (
    request: FastifyRequest,
    reply: FastifyReply,
) => {
    try {
        const checkRoles = await getRolesRepository();

        if (checkRoles && checkRoles.length > 0) {
            return reply.status(200).send({
                message: "Get roles with sucess",
                roles: checkRoles,
            });
        }

        return reply.status(404).send({ message: "Roles not found" });
    } catch (error) {
        request.log.error(error);
        return reply.status(500).send({
            message: "Internal server error while registering role",
        });
    }
};

import type { FastifyRequest, FastifyReply } from "fastify";
import { usecaseGetRole } from "@/router/private/admin/role/get/getRole.usecase";

export const getRolesController = async (
    request: FastifyRequest,
    reply: FastifyReply,
) => {
    try {
        const checkRoles = await usecaseGetRole();

        return reply.status(200).send({
            message: "Get roles with sucess",
            roles: checkRoles,
        });
    } catch (error: any) {
        request.log.error(error);

        if (error.message === "ROLES_NOT_FOUND") {
            return reply.status(404).send({ message: "Roles not found" });
        }
        return reply.status(500).send({
            message: "Internal server error while registering role",
        });
    }
};

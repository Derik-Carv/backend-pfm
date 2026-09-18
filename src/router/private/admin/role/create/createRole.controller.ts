import type { FastifyRequest, FastifyReply } from "fastify";
import {
    createRoleSchema,
    type CreateRoleInput,
} from "@/router/private/admin/role/role.schemas";
import { usecaseCreateRole } from "@/router/private/admin/role/create/createRole.usecase";

export const createRoleController = async (
    request: FastifyRequest<{ Body: CreateRoleInput }>,
    reply: FastifyReply,
) => {
    try {
        const { name } = createRoleSchema.parse(request.body);

        const newRole = await usecaseCreateRole(name);

        return reply.status(201).send({
            message: "Role register with sucess",
            role: newRole,
        });
    } catch (error: any) {
        request.log.error(error);

        if (error.messsage === "ROLE_ALREADY_EXISTS") {
            return reply
                .status(404)
                .send({ message: "Invalid name or name already registered" });
        }

        return reply.status(500).send({
            message: "Internal server error while registering role",
        });
    }
};

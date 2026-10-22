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

        if (error.name === "ZodError") {
            return reply.status(400).send({
                message: "Validation error",
                issues: error.errors,
            });
        }

        if (error.message === "ROLE_ALREADY_EXISTS") {
            return reply
                .status(409)
                .send({ message: "Role name already registered" });
        }

        return reply.status(500).send({
            message: "Internal server error while registering role",
        });
    }
};

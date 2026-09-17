import type { FastifyRequest, FastifyReply } from "fastify";
import type { CreateRoleInput } from "./role.schemas";
import {
    createRoleRepository,
    getRoleForNameRepository,
} from "@/database/users/roles.repository";

export const createRoleController = async (
    request: FastifyRequest<{ Body: CreateRoleInput }>,
    reply: FastifyReply,
) => {
    try {
        const { name } = request.body;

        console.log(name);

        const checkName = await getRoleForNameRepository(name);

        if (!checkName) {
            const newRole = await createRoleRepository(name);

            return reply.status(201).send({
                message: "Role register with sucess",
                role: newRole,
            });
        }

        return reply
            .status(404)
            .send({ message: "Invalid name or name already registered" });
    } catch (error) {
        request.log.error(error);
        return reply.status(500).send({
            message: "Internal server error while registering role",
        });
    }
};

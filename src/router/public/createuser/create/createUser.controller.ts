import type { FastifyRequest, FastifyReply } from "fastify";
import {
    createUserSchema,
    type CreateUserInput,
} from "@/router/public/createuser/user.schemas";
import { usecaseCreateUser } from "@/router/public/createuser/create/createUser.usecase";

export const createUserController = async (
    request: FastifyRequest<{ Body: CreateUserInput }>,
    reply: FastifyReply,
) => {
    try {
        const data = createUserSchema.parse(request.body);

        const register = await usecaseCreateUser(data);

        return reply.status(201).send(register);
    } catch (error: any) {
        request.log.error(error);

        if (error.message === "INVALID_CPF") {
            return reply.status(400).send({ message: "Cpf invalid" });
        }
        if (error.message === "INVALID_USERNAME") {
            return reply
                .status(400)
                .send({ message: "Username invalid or already in use" });
        }
        if (error.message === "ROLE_NOT_FOUND") {
            return reply.status(404).send({ message: "Role not found" });
        }

        return reply.status(500).send({
            message: "Internal server error while registering user",
        });
    }
};

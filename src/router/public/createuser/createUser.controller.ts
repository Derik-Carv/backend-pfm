import type { FastifyRequest, FastifyReply } from "fastify";
import type { CreateUserInput } from "./createUser.schemas";

export const createUserController = async (
    request: FastifyRequest<{ Body: CreateUserInput }>,
    reply: FastifyReply,
) => {
    try {
        const { name, surname, username, cpf } = request.body;

        // await newUser - return called repository for register in database

        const createdUser = {
            name,
            surname,
            username,
            cpf,
        };

        return reply.status(201).send({
            message: "User registered successfully",
            user: createdUser,
        });
    } catch (error) {
        request.log.error(error);
        return reply.status(500).send({
            message: "Internal server error while registering user",
        });
    }
};

import type { FastifyReply, FastifyRequest } from "fastify";
import type { LoginUserInput } from "./login.schemas";

export const loginController = async (
    request: FastifyRequest<{ Body: LoginUserInput }>,
    reply: FastifyReply,
) => {
    const { username, password } = request.body;

    return await { message: "Login route" };
};

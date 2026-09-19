import type { FastifyReply, FastifyRequest } from "fastify";
import {
    loginSchema,
    type LoginUserInput,
} from "@/router/public/login/login.schemas";
import { usecaseLogin } from "@/router/public/login/login.usecase";
import { jwtTokenGenerate } from "@/lib/jwt/jwt";

export const loginController = async (
    request: FastifyRequest<{ Body: LoginUserInput }>,
    reply: FastifyReply,
) => {
    try {
        const data = loginSchema.parse(request.body);

        const userloged = await usecaseLogin(data);

        const token = jwtTokenGenerate(request.server, {
            id: userloged.user.id,
            role: userloged.user.role,
            cpf: userloged.user.cpf,
        });

        return reply.status(200).send({ message: "login sucess", token });
    } catch (error: any) {
        if (error.message === "USERNAME_OR_PASSOWORD_INVALID") {
            reply.status(401).send({ message: "username or password invalid" });
        }

        return reply.status(500).send({
            message: "Internal server error while registering user",
        });
    }
};

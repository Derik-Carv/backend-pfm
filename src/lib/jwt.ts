import jwt from "@fastify/jwt";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import fp from "fastify-plugin";

export default fp(async (app: FastifyInstance) => {
    app.register(jwt, {
        secret: process.env.JWT_SECRET || "fallback_secret_key",
    });

    app.decorate(
        "authenticate",
        async (request: FastifyRequest, reply: FastifyReply) => {
            try {
                await request.jwtVerify();
            } catch (err) {
                reply.status(401).send({ message: "Não autorizado" });
            }
        },
    );
});

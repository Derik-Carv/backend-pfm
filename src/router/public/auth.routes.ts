import type { FastifyInstance } from "fastify";
import { loginSchema, healthSchema } from "@/router/public/schemasPublic";

export async function publicRoutes(app: FastifyInstance) {
    app.post(
        "/login",
        {
            schema: loginSchema,
        },
        async (request, reply) => {
            return await { message: "Login route" };
        },
    );

    app.get(
        "/health",
        {
            schema: healthSchema,
        },
        async (request, reply) => {
            return await { status: "ok" };
        },
    );
}

import type { FastifyInstance } from "fastify";
import { rateLimitProfiles } from "@/lib/rateLimit";
import { loginSchema, healthSchema } from "@/router/public/schemasPublic";
import { corsOptions } from "@/policies/cors";

export async function publicRoutes(app: FastifyInstance) {
    app.post(
        "/login",
        {
            config: {
                rateLimit: rateLimitProfiles.standard,
            },
            schema: loginSchema,
        },
        async (request, reply) => {
            return await { message: "Login route" };
        },
    );

    app.get(
        "/health",
        {
            config: {
                rateLimit: rateLimitProfiles.standard,
            },
            schema: healthSchema,
        },
        async (request, reply) => {
            return await { status: "ok" };
        },
    );
}

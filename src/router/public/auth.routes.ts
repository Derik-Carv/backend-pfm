import type { FastifyInstance } from "fastify";
import { rateLimitProfiles } from "@/lib/rateLimit";
import {
    healthResponseSchema,
    loginResponseSchema,
    loginSchema,
} from "@/router/public/schemasPublic";

export async function publicRoutes(app: FastifyInstance) {
    app.post(
        "/login",
        {
            config: {
                rateLimit: rateLimitProfiles.standard,
            },
            schema: {
                description: "Route for login authetication",
                tags: ["Public"],
                body: loginSchema,
                response: { 200: loginResponseSchema },
            },
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
            schema: {
                description: "Check server status health",
                tags: ["Public"],
                response: { 200: healthResponseSchema },
            },
        },
        async (request, reply) => {
            return await { status: "ok" };
        },
    );
}

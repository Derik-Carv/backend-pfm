import type { FastifyCorsOptions } from "@fastify/cors";

export const corsOptions: FastifyCorsOptions = {
    origin:
        process.env.NODE_ENV != "production" ? "*" : process.env.CORS_ORIGIN,
    methods: ["GET", "POST", "PATCH"],
    maxAge: 600,
    allowedHeaders: ["Content-Type", "Authorization"],
    hook: "onRequest",
    credentials: true,
};

import type { FastifyCorsOptions } from "@fastify/cors";

const configuredOrigins = (process.env.CORS_ORIGIN ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

export const corsOptions: FastifyCorsOptions = {
    origin:
        process.env.NODE_ENV != "production" ? "*" : configuredOrigins,
    methods: ["GET", "POST", "PATCH"],
    maxAge: 600,
    allowedHeaders: ["Content-Type", "Authorization"],
    hook: "onRequest",
    credentials: true,
};

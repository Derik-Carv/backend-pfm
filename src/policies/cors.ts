import type { FastifyCorsOptions } from "@fastify/cors";

const allowedOrigin = process.env.CORS_ORIGIN?.trim();

export const corsOptions: FastifyCorsOptions = {
    origin: (requestOrigin, callback) => {
        if (process.env.NODE_ENV !== "production") {
            callback(null, true);
            return;
        }

        callback(null, requestOrigin === allowedOrigin);
    },
    methods: ["GET", "POST", "PATCH"],
    maxAge: 600,
    allowedHeaders: ["Content-Type", "Authorization"],
    hook: "onRequest",
    credentials: true,
};

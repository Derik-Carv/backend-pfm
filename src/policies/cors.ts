import type { FastifyCorsOptions } from "@fastify/cors";

const allowedOrigins = (process.env.CORS_ORIGIN ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

export const corsOptions: FastifyCorsOptions = {
    origin: (requestOrigin, callback) => {
        if ((Bun.env.NODE_ENV ?? process.env.NODE_ENV) !== "production") {
            callback(null, true);
            return;
        }

        if (!requestOrigin) {
            callback(null, true);
            return;
        }

        callback(null, allowedOrigins.includes(requestOrigin));
    },
    methods: ["GET", "POST", "PATCH"],
    maxAge: 600,
    allowedHeaders: [
        "Content-Type",
        "Authorization",
        "x-company-id",
        "x-view-scope",
    ],
    hook: "onRequest",
    credentials: true,
};

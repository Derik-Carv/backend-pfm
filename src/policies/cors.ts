import type { FastifyCorsOptions } from "@fastify/cors";

const allowedOrigins = (process.env.CORS_ORIGIN ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

const localDevOriginRegex = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

export const corsOptions: FastifyCorsOptions = {
    origin: (requestOrigin, callback) => {
        if (!requestOrigin) {
            callback(null, true);
            return;
        }

        if ((Bun.env.NODE_ENV ?? process.env.NODE_ENV) !== "production") {
            callback(
                null,
                allowedOrigins.includes(requestOrigin) ||
                    localDevOriginRegex.test(requestOrigin),
            );
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

import type { RateLimitOptions } from "@fastify/rate-limit";

export const rateLimitProfiles = {
    sensitive: {
        max: 10,
        timeWindow: "1 minute",
        ban: 20,
        hook: "onRequest",
    },
    auth: {
        max: 15,
        timeWindow: "1 minute",
        ban: 20,
        hook: "onRequest",
    },
    default: {
        max: 60,
        timeWindow: "1 minute",
        hook: "onRequest", // check before checking the payload in fastify
    },
    standard: {
        max: 60,
        timeWindow: "1 minute",
        hook: "onRequest",
    },
    advanced: {
        max: 120,
        timeWindow: "1 minute",
        hook: "onRequest",
    },
    manager: {
        max: 500,
        timeWindow: "1 minute",
        hook: "onRequest",
    },
} as const;

export type RateLimitTypes = keyof typeof rateLimitProfiles;

export const globalRateLimitConfig: RateLimitOptions = {
    ...rateLimitProfiles.default,
};

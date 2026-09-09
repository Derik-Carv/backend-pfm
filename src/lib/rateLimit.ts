import type { RateLimitOptions } from "@fastify/rate-limit";

export const rateLimitProfiles = {
    default: {
        max: 7,
        timeWindow: "1 minute",
        ban: 10000,
        hook: "preParsing", // check before checking the payload in fastify
    },
    standard: {
        max: 15,
        timeWindow: "1 minute",
        ban: 10000,
        hook: "preParsing",
    },
    advanced: {
        max: 20,
        timeWindow: "1 minute",
        ban: 10000,
        hook: "preParsing",
    },
    manager: {
        max: 500,
        timeWindow: "1 minute",
        ban: 1000,
        hook: "preParsing",
    },
} as const;

export type RateLimitTypes = keyof typeof rateLimitProfiles;

export const globalRateLimitConfig: RateLimitOptions = {
    ...rateLimitProfiles.default,
};

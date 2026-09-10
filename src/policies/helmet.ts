import type { FastifyHelmetOptions } from "@fastify/helmet";

export const helmetOptions: FastifyHelmetOptions = {
    xFrameOptions: {
        action: "sameorigin",
    },
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'"],
            imgSrc: ["'self'"],
        },
    },
    // hsts: {  // only active with https active
    //     maxAge: 31536000, // 1 ano em segundos
    //     includeSubDomains: true,
    //     preload: true,
    // },
    dnsPrefetchControl: false,
};

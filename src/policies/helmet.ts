import type { FastifyHelmetOptions } from "@fastify/helmet";

const isProd = (Bun.env.NODE_ENV ?? process.env.NODE_ENV) === "production";

export const helmetOptions: FastifyHelmetOptions = {
    xFrameOptions: {
        action: "deny",
    },
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'"],
            imgSrc: ["'self'"],
            objectSrc: ["'none'"],
            baseUri: ["'self'"],
            formAction: ["'self'"],
            frameAncestors: ["'none'"],
        },
    },
    ...(isProd
        ? {
              hsts: {
                  maxAge: 31536000,
                  includeSubDomains: true,
              },
          }
        : {}),
};

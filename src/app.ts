import fastify from "fastify";
import fasfitySwagger from "@fastify/swagger";
import fasfitySwaggerUi from "@fastify/swagger-ui";
import cors from "@fastify/cors";
import { corsOptions } from "./policies/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { globalRateLimitConfig } from "@/lib/rateLimit";
import { appRoutes } from "@/router";
import { helmetOptions } from "@/policies/helmet";
import {
    serializerCompiler,
    validatorCompiler,
} from "@fastify/type-provider-zod";
import type { ZodTypeProvider } from "@fastify/type-provider-zod";

const isDev = process.env.NODE_ENV !== "production";

// define fastify and logger configuration
export const app = fastify({
    logger: isDev
        ? {
              transport: {
                  target: "pino-pretty",
                  options: {
                      translateTime: "HH:MM:ss Z",
                      ignore: "pid,hostname",
                  },
              },
          }
        : true,
})
    .withTypeProvider<ZodTypeProvider>()
    .setValidatorCompiler(validatorCompiler)
    .setSerializerCompiler(serializerCompiler);

await app.register(cors, corsOptions);

await app.register(helmet, helmetOptions);

await app.register(rateLimit, globalRateLimitConfig);

// configuration of swagger and swagger-ui for API documentation
app.register(fasfitySwagger, {
    openapi: {
        info: {
            title: "API Principal Backend",
            description: "Documentation for API Backend",
            version: "1.0.0",
        },
    },
});

app.register(fasfitySwaggerUi, {
    routePrefix: "/docs",
});

app.register(appRoutes);

import fastify from "fastify";
import fasfitySwagger from "@fastify/swagger";
import fasfitySwaggerUi from "@fastify/swagger-ui";
import cors from "@fastify/cors";
import { corsOptions } from "./policies/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { globalRateLimitConfig } from "@/policies/rateLimit";
import { appRoutes } from "@/router";
import { helmetOptions } from "@/policies/helmet";
import {
    type ZodTypeProvider,
    validatorCompiler,
    serializerCompiler,
    jsonSchemaTransform,
} from "fastify-type-provider-zod";
import fastifyJwt from "@fastify/jwt";
import { loggerConfig, loggerProd } from "./config/logger";
import fastifyMultipart from "@fastify/multipart";
import { nfCreateMultipartOpenApiSchema } from "./router/private/NF/nf.schemas";

const isDev = process.env.NODE_ENV !== "production";
const jwtSecret = process.env.JWT_SECRET as string;

// define fastify and logger configuration
export const app = fastify({
    logger: isDev ? loggerConfig : loggerProd,
})
    .withTypeProvider<ZodTypeProvider>()
    .setValidatorCompiler(validatorCompiler)
    .setSerializerCompiler(serializerCompiler);

await app.register(cors, corsOptions);

await app.register(helmet, helmetOptions);

await app.register(rateLimit, globalRateLimitConfig);

await app.register(fastifyJwt, {
    secret: jwtSecret,
});

app.register(fastifyMultipart);

app.register(fasfitySwagger, {
    openapi: {
        info: {
            title: "API Principal Backend",
            description: "Documentation for API Backend",
            version: "1.0.0",
        },
    },
    transform: (document) => {
        const transformed = jsonSchemaTransform(document);

        if (
            (document.url === "/nf" || document.url === "/nf/") &&
            transformed.schema
        ) {
            return {
                ...transformed,
                schema: {
                    ...transformed.schema,
                    body: nfCreateMultipartOpenApiSchema,
                },
            };
        }

        return transformed;
    },
});

app.register(fasfitySwaggerUi, {
    routePrefix: "/docs",
});

app.register(appRoutes);

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
import { extractRequestMeta, recordAuditLog } from "./lib/lgpd/audit";

const isDev = (Bun.env.NODE_ENV ?? process.env.NODE_ENV) !== "production";
const jwtSecret = process.env.JWT_SECRET as string;

// define fastify and logger configuration
export const app = fastify({
    logger: isDev ? loggerConfig : loggerProd,
})
    .withTypeProvider<ZodTypeProvider>()
    .setValidatorCompiler(validatorCompiler)
    .setSerializerCompiler(serializerCompiler);

const auditEnabled = process.env.AUDIT_LOG_ENABLED === "true";

app.addHook("onResponse", async (request, reply) => {
    const urlPath = request.routeOptions.url || request.url.split("?")[0] || "";
    const isMutating = ["POST", "PUT", "PATCH", "DELETE"].includes(request.method);
    const isSensitiveRead =
        request.method === "GET" &&
        (urlPath.startsWith("/admin/data") ||
            urlPath === "/account/privacy/export" ||
            (urlPath.startsWith("/nf/") && urlPath.endsWith("/file")));

    if (
        (!isMutating && !isSensitiveRead) ||
        urlPath === "/public/login"
    ) {
        return;
    }

    const meta = extractRequestMeta(request);
    const params = (request.params ?? {}) as Record<string, unknown>;
    const targetId =
        typeof params.id === "string"
            ? params.id
            : undefined;
    const targetTable =
        typeof params.table === "string"
            ? params.table
            : urlPath.split("/").filter(Boolean)[0] ?? undefined;

    await recordAuditLog({
        actorId: request.user?.id ?? null,
        actorRole: request.user?.role ?? null,
        companyId: request.tenant?.activeCompanyId ?? null,
        action: `${request.method.toLowerCase()}:${urlPath}`,
        targetTable,
        targetId,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        statusCode: reply.statusCode,
        metadata: {
            success: reply.statusCode < 400,
        },
    });

    if (auditEnabled) {
        request.log.info(
            {
                audit: true,
                auditAction: request.method.toLowerCase(),
                actorId: request.user?.id ?? null,
                actorRole: request.user?.role ?? null,
                method: request.method,
                route: urlPath,
                statusCode: reply.statusCode,
                success: reply.statusCode < 400,
                requestId: request.id,
            },
            "Audit action",
        );
    }
});

await app.register(cors, corsOptions);

await app.register(helmet, helmetOptions);

await app.register(rateLimit, globalRateLimitConfig);

await app.register(fastifyJwt, {
    secret: jwtSecret,
});

app.register(fastifyMultipart);

if (isDev) {
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
}

app.register(appRoutes);

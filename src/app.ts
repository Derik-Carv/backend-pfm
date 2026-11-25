import fastify from "fastify";
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

if (
    !isDev &&
    (!jwtSecret ||
        jwtSecret.trim().length < 32 ||
        jwtSecret.includes("change-me"))
) {
    throw new Error(
        "JWT_SECRET must be defined with at least 32 characters and not use placeholder values in production.",
    );
}

const trustProxyEnv = (
    Bun.env.TRUST_PROXY ??
    process.env.TRUST_PROXY ??
    "loopback, linklocal, uniquelocal"
).trim();
const trustProxy: boolean | string =
    trustProxyEnv === "false" || trustProxyEnv === "0"
        ? false
        : trustProxyEnv === "true"
          ? true
          : trustProxyEnv;

// define fastify and logger configuration
export const app = fastify({
    logger: isDev ? loggerConfig : loggerProd,
    trustProxy,
    bodyLimit: 1024 * 1024,
    connectionTimeout: 10_000,
    requestTimeout: 30_000,
})
    .withTypeProvider<ZodTypeProvider>()
    .setValidatorCompiler(validatorCompiler)
    .setSerializerCompiler(serializerCompiler);

app.setErrorHandler((error, request, reply) => {
    request.log.error({ err: error }, "Unhandled request error");

    const fastifyError = error as { statusCode?: number; code?: string; message?: string };
    const statusCode =
        fastifyError.code === "FST_REQ_FILE_TOO_LARGE"
            ? 413
            : typeof fastifyError.statusCode === "number" &&
                fastifyError.statusCode >= 400 &&
                fastifyError.statusCode < 500
              ? fastifyError.statusCode
              : 500;

    if (statusCode >= 500) {
        return reply.status(500).send({
            message: "Internal server error",
            statusCode: 500,
        });
    }

    return reply.status(statusCode).send({
        message: fastifyError.message || "Bad request",
        statusCode,
    });
});

const auditEnabled = process.env.AUDIT_LOG_ENABLED === "true";

app.addHook("onResponse", async (request, reply) => {
    // Não persistir rotas inexistentes / scans 404 públicos na tabela LGPD audit_logs
    const matchedRoute = request.routeOptions.url;
    if (!matchedRoute) {
        return;
    }

    const urlPath = matchedRoute;
    const isMutating = ["POST", "PUT", "PATCH", "DELETE"].includes(request.method);
    const isSensitiveRead =
        request.method === "GET" &&
        (urlPath.startsWith("/admin/data") ||
            urlPath.startsWith("/admin/lgpd") ||
            urlPath.startsWith("/admin/company-requests") ||
            urlPath === "/admin/system/clients" ||
            urlPath === "/account/privacy/export" ||
            ((urlPath.startsWith("/notes/") || urlPath.startsWith("/nf/")) &&
                urlPath.endsWith("/file")));

    if (
        (!isMutating && !isSensitiveRead) ||
        urlPath === "/public/login" ||
        urlPath === "/account/privacy/anonymize"
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
    sign: {
        algorithm: "HS256",
    },
    verify: {
        algorithms: ["HS256"],
    },
});

app.register(fastifyMultipart, {
    limits: {
        fileSize: 10 * 1024 * 1024,
        files: 1,
        fields: 5,
        fieldSize: 64 * 1024,
        parts: 10,
    },
});

if (isDev) {
    const [{ default: fasfitySwagger }, { default: fasfitySwaggerUi }] =
        await Promise.all([
            import("@fastify/swagger"),
            import("@fastify/swagger-ui"),
        ]);

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

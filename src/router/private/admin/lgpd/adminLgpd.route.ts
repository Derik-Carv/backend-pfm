import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { db } from "@/database/index";
import { auditLogs } from "@/database/schema/schema";
import { and, count, desc, eq } from "drizzle-orm";
import { runLgpdRetentionCleanup } from "@/lib/lgpd/retention";
import { errorResponseSchema } from "@/router/error.schema";

const auditLogQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(25),
    action: z.string().trim().min(1).optional(),
});

const auditLogItemSchema = z.object({
    id: z.string().uuid(),
    actorId: z.string().uuid().nullable(),
    actorRole: z.string().nullable(),
    companyId: z.string().uuid().nullable(),
    action: z.string(),
    targetTable: z.string().nullable(),
    targetId: z.string().nullable(),
    ipAddress: z.string().nullable(),
    statusCode: z.number().nullable(),
    createdAt: z.date(),
});

const listAuditLogsResponseSchema = z.object({
    logs: z.array(auditLogItemSchema),
    total: z.number(),
    page: z.number(),
    limit: z.number(),
});

const cleanupResponseSchema = z.object({
    message: z.string(),
    deletedOtpCodes: z.number(),
    scrubbedRequestHashes: z.number(),
    deletedRejectedRequests: z.number(),
});

export async function adminLgpdRoutes(app: FastifyInstance) {
    app.get(
        "/audit-logs",
        {
            schema: {
                tags: ["Admin SaaS", "LGPD"],
                summary: "List persisted LGPD audit logs",
                querystring: auditLogQuerySchema,
                response: {
                    200: listAuditLogsResponseSchema,
                    500: errorResponseSchema,
                },
            },
        },
        async (request: FastifyRequest, reply: FastifyReply) => {
            const { page, limit, action } = auditLogQuerySchema.parse(
                request.query,
            );
            const whereClause = action
                ? eq(auditLogs.action, action)
                : undefined;
            const offset = (page - 1) * limit;

            const [logs, [{ total }]] = await Promise.all([
                db
                    .select({
                        id: auditLogs.id,
                        actorId: auditLogs.actorId,
                        actorRole: auditLogs.actorRole,
                        companyId: auditLogs.companyId,
                        action: auditLogs.action,
                        targetTable: auditLogs.targetTable,
                        targetId: auditLogs.targetId,
                        ipAddress: auditLogs.ipAddress,
                        statusCode: auditLogs.statusCode,
                        createdAt: auditLogs.createdAt,
                    })
                    .from(auditLogs)
                    .where(whereClause)
                    .orderBy(desc(auditLogs.createdAt))
                    .limit(limit)
                    .offset(offset),
                db.select({ total: count() }).from(auditLogs).where(whereClause),
            ]);

            return reply.status(200).send({
                logs,
                total,
                page,
                limit,
            });
        },
    );

    app.post(
        "/cleanup",
        {
            schema: {
                tags: ["Admin SaaS", "LGPD"],
                summary: "Run manual LGPD retention & data scrubbing cleanup",
                response: {
                    200: cleanupResponseSchema,
                    500: errorResponseSchema,
                },
            },
        },
        async (_request: FastifyRequest, reply: FastifyReply) => {
            const counts = await runLgpdRetentionCleanup();
            return reply.status(200).send({
                message: "Rotina de retenção e expurgo LGPD executada com sucesso.",
                ...counts,
            });
        },
    );
}

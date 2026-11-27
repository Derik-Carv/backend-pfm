import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { db } from "@/database/index";
import { auditLogs, securityIncidents } from "@/database/schema/schema";
import { count, desc, eq } from "drizzle-orm";
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
    deletedExpiredAuditLogs: z.number(),
    deletedExpiredIncidents: z.number(),
});

const incidentItemSchema = z.object({
    id: z.string().uuid(),
    title: z.string(),
    description: z.string(),
    severity: z.string(),
    affectedDataCategories: z.string(),
    affectedSubjectsEstimate: z.number().nullable(),
    relevantRisk: z.boolean(),
    notifiedAnpd: z.boolean(),
    notifiedAnpdAt: z.date().nullable(),
    notifiedSubjects: z.boolean(),
    notifiedSubjectsAt: z.date().nullable(),
    containmentMeasures: z.string().nullable(),
    status: z.string(),
    detectedAt: z.date(),
    reportedBy: z.string().uuid().nullable(),
    createdAt: z.date(),
    updatedAt: z.date(),
});

const createIncidentBodySchema = z
    .object({
        title: z.string().trim().min(3).max(200),
        description: z.string().trim().min(5).max(4000),
        severity: z.enum(["low", "medium", "high", "critical"]),
        affectedDataCategories: z.string().trim().min(2).max(500),
        affectedSubjectsEstimate: z.coerce.number().int().min(0).optional(),
        relevantRisk: z.boolean().default(false),
        notifiedAnpd: z.boolean().default(false),
        notifiedSubjects: z.boolean().default(false),
        containmentMeasures: z.string().trim().max(4000).optional(),
        detectedAt: z.coerce.date().optional(),
    })
    .strict();

const updateIncidentBodySchema = z
    .object({
        status: z.enum(["open", "mitigated", "closed"]).optional(),
        containmentMeasures: z.string().trim().max(4000).optional(),
        relevantRisk: z.boolean().optional(),
        notifiedAnpd: z.boolean().optional(),
        notifiedSubjects: z.boolean().optional(),
    })
    .strict();

const incidentIdParamsSchema = z.object({
    id: z.string().uuid(),
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

    app.get(
        "/incidents",
        {
            schema: {
                tags: ["Admin SaaS", "LGPD"],
                summary:
                    "List 5-year security incident registry (Res. CD/ANPD 15/2024)",
                response: {
                    200: z.object({
                        incidents: z.array(incidentItemSchema),
                    }),
                    500: errorResponseSchema,
                },
            },
        },
        async (_request: FastifyRequest, reply: FastifyReply) => {
            const incidents = await db
                .select()
                .from(securityIncidents)
                .orderBy(desc(securityIncidents.detectedAt))
                .limit(100);

            return reply.status(200).send({ incidents });
        },
    );

    app.post(
        "/incidents",
        {
            schema: {
                tags: ["Admin SaaS", "LGPD"],
                summary:
                    "Record a security incident in the 5-year ANPD registry",
                body: createIncidentBodySchema,
                response: {
                    201: z.object({
                        message: z.string(),
                        incident: incidentItemSchema,
                    }),
                    400: errorResponseSchema,
                    500: errorResponseSchema,
                },
            },
        },
        async (request: FastifyRequest, reply: FastifyReply) => {
            const data = createIncidentBodySchema.parse(request.body);
            const now = new Date();
            const [incident] = await db
                .insert(securityIncidents)
                .values({
                    title: data.title,
                    description: data.description,
                    severity: data.severity,
                    affectedDataCategories: data.affectedDataCategories,
                    affectedSubjectsEstimate:
                        data.affectedSubjectsEstimate ?? null,
                    relevantRisk: data.relevantRisk,
                    notifiedAnpd: data.notifiedAnpd,
                    notifiedAnpdAt: data.notifiedAnpd ? now : null,
                    notifiedSubjects: data.notifiedSubjects,
                    notifiedSubjectsAt: data.notifiedSubjects ? now : null,
                    containmentMeasures: data.containmentMeasures ?? null,
                    status: "open",
                    detectedAt: data.detectedAt ?? now,
                    reportedBy: request.user.id,
                })
                .returning();

            return reply.status(201).send({
                message: "Incidente registrado com sucesso (guarda mínima 5 anos — Res. CD/ANPD nº 15/2024).",
                incident,
            });
        },
    );

    app.patch(
        "/incidents/:id",
        {
            schema: {
                tags: ["Admin SaaS", "LGPD"],
                summary: "Update security incident status or ANPD notification timestamps",
                params: incidentIdParamsSchema,
                body: updateIncidentBodySchema,
                response: {
                    200: z.object({
                        message: z.string(),
                        incident: incidentItemSchema,
                    }),
                    404: errorResponseSchema,
                    500: errorResponseSchema,
                },
            },
        },
        async (request: FastifyRequest, reply: FastifyReply) => {
            const { id } = incidentIdParamsSchema.parse(request.params);
            const data = updateIncidentBodySchema.parse(request.body);

            const [existing] = await db
                .select()
                .from(securityIncidents)
                .where(eq(securityIncidents.id, id))
                .limit(1);

            if (!existing) {
                return reply.status(404).send({
                    message: "Incidente não encontrado.",
                });
            }

            const now = new Date();
            const updates: Partial<typeof securityIncidents.$inferInsert> = {
                updatedAt: now,
            };

            if (data.status !== undefined) updates.status = data.status;
            if (data.containmentMeasures !== undefined) {
                updates.containmentMeasures = data.containmentMeasures;
            }
            if (data.relevantRisk !== undefined) {
                updates.relevantRisk = data.relevantRisk;
            }
            if (data.notifiedAnpd !== undefined) {
                updates.notifiedAnpd = data.notifiedAnpd;
                updates.notifiedAnpdAt = data.notifiedAnpd
                    ? (existing.notifiedAnpdAt ?? now)
                    : null;
            }
            if (data.notifiedSubjects !== undefined) {
                updates.notifiedSubjects = data.notifiedSubjects;
                updates.notifiedSubjectsAt = data.notifiedSubjects
                    ? (existing.notifiedSubjectsAt ?? now)
                    : null;
            }

            const [incident] = await db
                .update(securityIncidents)
                .set(updates)
                .where(eq(securityIncidents.id, id))
                .returning();

            return reply.status(200).send({
                message: "Incidente atualizado com sucesso.",
                incident,
            });
        },
    );
}

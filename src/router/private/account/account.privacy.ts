import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { db } from "@/database/index";
import {
    auditLogs,
    companies,
    emailVerificationCodes,
    legalAcceptances,
    roles,
    userCompanies,
    users,
} from "@/database/schema/schema";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { verifyPassword } from "@/lib/hash";
import { extractRequestMeta, recordAuditLog } from "@/lib/lgpd/audit";
import {
    LEGAL_PRIVACY_VERSION,
    LEGAL_TERMS_VERSION,
    getLegalMetadata,
    maskCpf,
} from "@/lib/lgpd/legal.constants";
import { errorResponseSchema } from "@/router/error.schema";

const legalAcceptanceItemSchema = z.object({
    id: z.string().uuid(),
    documentType: z.string(),
    documentVersion: z.string(),
    acceptedAt: z.date(),
});

const legalMetadataSchema = z.object({
    termsVersion: z.string(),
    privacyVersion: z.string(),
    dpo: z.object({
        name: z.string(),
        email: z.string(),
    }),
    fiscalRetentionYears: z.number(),
    auditLogRetentionYears: z.number(),
    incidentRetentionYears: z.number(),
    incidentNotificationBusinessDays: z.number(),
    smallAgentNotificationBusinessDays: z.number(),
    otpRetentionHours: z.number(),
    rejectedRequestRetentionDays: z.number(),
    subprocessors: z.array(
        z.object({
            name: z.string(),
            purpose: z.string(),
            mechanism: z.string(),
        }),
    ),
});

const privacyMeResponseSchema = z.object({
    user: z.object({
        id: z.string().uuid(),
        name: z.string(),
        surname: z.string(),
        username: z.string(),
        email: z.string().nullable(),
        emailVerified: z.boolean(),
        cpfMasked: z.string(),
        role: z.string(),
        createdAt: z.date(),
        anonymizedAt: z.date().nullable(),
    }),
    companies: z.array(
        z.object({
            id: z.string().uuid(),
            tradeName: z.string(),
            cnpj: z.string(),
            isMother: z.boolean(),
        }),
    ),
    legalAcceptances: z.array(legalAcceptanceItemSchema),
    legalAcceptanceRequired: z.boolean(),
    legalMetadata: legalMetadataSchema,
});

const acceptLegalBodySchema = z
    .object({
        acceptedTerms: z.literal(true, {
            message: "Terms acceptance is required",
        }),
        acceptedPrivacy: z.literal(true, {
            message: "Privacy policy acceptance is required",
        }),
    })
    .strict();

const acceptLegalResponseSchema = z.object({
    message: z.string(),
    legalAcceptanceRequired: z.boolean(),
    acceptedAt: z.date(),
});

const updateProfileBodySchema = z
    .object({
        name: z.string().trim().min(2).max(100),
        surname: z.string().trim().min(2).max(100),
    })
    .strict();

const updateProfileResponseSchema = z.object({
    message: z.string(),
    user: z.object({
        id: z.string().uuid(),
        name: z.string(),
        surname: z.string(),
    }),
});

const privacyExportResponseSchema = z.object({
    exportedAt: z.string(),
    legalNotice: z.string(),
    user: z.object({
        id: z.string().uuid(),
        name: z.string(),
        surname: z.string(),
        username: z.string(),
        email: z.string().nullable(),
        emailVerified: z.boolean(),
        cpfMasked: z.string(),
        role: z.string(),
        active: z.boolean(),
        createdAt: z.date(),
        anonymizedAt: z.date().nullable(),
    }),
    companies: z.array(
        z.object({
            id: z.string().uuid(),
            tradeName: z.string(),
            cnpj: z.string(),
            isMother: z.boolean(),
        }),
    ),
    legalAcceptances: z.array(legalAcceptanceItemSchema),
    recentAuditEvents: z.array(
        z.object({
            id: z.string().uuid(),
            action: z.string(),
            targetTable: z.string().nullable(),
            statusCode: z.number().nullable(),
            ipAddress: z.string().nullable(),
            createdAt: z.date(),
        }),
    ),
});

const anonymizeBodySchema = z
    .object({
        currentPassword: z.string().trim().min(6).max(100),
        confirmation: z.literal("ANONIMIZAR", {
            message: 'Confirmação inválida. Digite exatamente "ANONIMIZAR".',
        }),
    })
    .strict();

const anonymizeResponseSchema = z.object({
    message: z.string(),
    anonymizedAt: z.date(),
    fiscalRetentionNotice: z.string(),
});

async function loadUserCompaniesForPrivacy(
    userId: string,
    primaryCompanyId: string | null,
) {
    const links = await db
        .select({
            id: companies.id,
            tradeName: companies.tradeName,
            cnpj: companies.cnpj,
            motherId: companies.motherId,
        })
        .from(userCompanies)
        .innerJoin(companies, eq(userCompanies.companyId, companies.id))
        .where(eq(userCompanies.userId, userId));

    const byId = new Map(links.map((c) => [c.id, c]));
    if (primaryCompanyId && !byId.has(primaryCompanyId)) {
        const [primary] = await db
            .select({
                id: companies.id,
                tradeName: companies.tradeName,
                cnpj: companies.cnpj,
                motherId: companies.motherId,
            })
            .from(companies)
            .where(eq(companies.id, primaryCompanyId))
            .limit(1);
        if (primary) byId.set(primary.id, primary);
    }

    return [...byId.values()].map((c) => ({
        id: c.id,
        tradeName: c.tradeName,
        cnpj: c.cnpj,
        isMother: c.motherId === null,
    }));
}

export async function registerAccountPrivacyRoutes(app: FastifyInstance) {
    app.get(
        "/privacy/me",
        {
            schema: {
                tags: ["Account", "LGPD"],
                summary: "Get personal data summary and LGPD acceptances",
                response: {
                    200: privacyMeResponseSchema,
                    404: errorResponseSchema,
                    500: errorResponseSchema,
                },
            },
        },
        async (request: FastifyRequest, reply: FastifyReply) => {
            const [user] = await db
                .select()
                .from(users)
                .where(eq(users.id, request.user.id))
                .limit(1);

            if (!user) {
                return reply.status(404).send({ message: "User not found" });
            }

            const [linkedCompanies, acceptances] = await Promise.all([
                loadUserCompaniesForPrivacy(user.id, user.primaryCompanyId),
                db
                    .select({
                        id: legalAcceptances.id,
                        documentType: legalAcceptances.documentType,
                        documentVersion: legalAcceptances.documentVersion,
                        acceptedAt: legalAcceptances.acceptedAt,
                    })
                    .from(legalAcceptances)
                    .where(eq(legalAcceptances.userId, user.id))
                    .orderBy(desc(legalAcceptances.acceptedAt)),
            ]);

            const hasTerms = acceptances.some(
                (a) =>
                    a.documentType === "terms_of_use" &&
                    a.documentVersion === LEGAL_TERMS_VERSION,
            );
            const hasPrivacy = acceptances.some(
                (a) =>
                    a.documentType === "privacy_policy" &&
                    a.documentVersion === LEGAL_PRIVACY_VERSION,
            );

            return reply.status(200).send({
                user: {
                    id: user.id,
                    name: user.name,
                    surname: user.surname,
                    username: user.username,
                    email: user.email,
                    emailVerified: user.emailVerified,
                    cpfMasked: maskCpf(user.cpf),
                    role: request.user.role,
                    createdAt: user.createdAt,
                    anonymizedAt: user.anonymizedAt,
                },
                companies: linkedCompanies,
                legalAcceptances: acceptances,
                legalAcceptanceRequired: !(hasTerms && hasPrivacy),
                legalMetadata: getLegalMetadata(),
            });
        },
    );

    app.post(
        "/legal/accept",
        {
            schema: {
                tags: ["Account", "LGPD"],
                summary: "Record user acceptance of current Terms and Privacy Policy",
                body: acceptLegalBodySchema,
                response: {
                    200: acceptLegalResponseSchema,
                    400: errorResponseSchema,
                    500: errorResponseSchema,
                },
            },
        },
        async (request: FastifyRequest, reply: FastifyReply) => {
            acceptLegalBodySchema.parse(request.body);
            const meta = extractRequestMeta(request);
            const acceptedAt = new Date();

            const existing = await db
                .select({
                    documentType: legalAcceptances.documentType,
                    documentVersion: legalAcceptances.documentVersion,
                })
                .from(legalAcceptances)
                .where(eq(legalAcceptances.userId, request.user.id));

            const toInsert: Array<{
                userId: string;
                documentType: string;
                documentVersion: string;
                ipAddress: string | null;
                userAgent: string | null;
                acceptedAt: Date;
            }> = [];

            if (
                !existing.some(
                    (a) =>
                        a.documentType === "terms_of_use" &&
                        a.documentVersion === LEGAL_TERMS_VERSION,
                )
            ) {
                toInsert.push({
                    userId: request.user.id,
                    documentType: "terms_of_use",
                    documentVersion: LEGAL_TERMS_VERSION,
                    ipAddress: meta.ipAddress,
                    userAgent: meta.userAgent,
                    acceptedAt,
                });
            }

            if (
                !existing.some(
                    (a) =>
                        a.documentType === "privacy_policy" &&
                        a.documentVersion === LEGAL_PRIVACY_VERSION,
                )
            ) {
                toInsert.push({
                    userId: request.user.id,
                    documentType: "privacy_policy",
                    documentVersion: LEGAL_PRIVACY_VERSION,
                    ipAddress: meta.ipAddress,
                    userAgent: meta.userAgent,
                    acceptedAt,
                });
            }

            if (toInsert.length > 0) {
                await db.insert(legalAcceptances).values(toInsert);
            }

            return reply.status(200).send({
                message: "Aceite registrado com sucesso.",
                legalAcceptanceRequired: false,
                acceptedAt,
            });
        },
    );

    app.patch(
        "/profile",
        {
            schema: {
                tags: ["Account", "LGPD"],
                summary: "Update authenticated user personal name/surname (LGPD Art. 18 III)",
                body: updateProfileBodySchema,
                response: {
                    200: updateProfileResponseSchema,
                    400: errorResponseSchema,
                    404: errorResponseSchema,
                },
            },
        },
        async (request: FastifyRequest, reply: FastifyReply) => {
            const data = updateProfileBodySchema.parse(request.body);
            const [updated] = await db
                .update(users)
                .set({
                    name: data.name,
                    surname: data.surname,
                })
                .where(eq(users.id, request.user.id))
                .returning({
                    id: users.id,
                    name: users.name,
                    surname: users.surname,
                });

            if (!updated) {
                return reply.status(404).send({ message: "User not found" });
            }

            return reply.status(200).send({
                message: "Dados cadastrais atualizados com sucesso.",
                user: updated,
            });
        },
    );

    app.get(
        "/privacy/export",
        {
            schema: {
                tags: ["Account", "LGPD"],
                summary: "Export personal data for portability (LGPD Art. 18 II & V)",
                response: {
                    200: privacyExportResponseSchema,
                    404: errorResponseSchema,
                },
            },
        },
        async (request: FastifyRequest, reply: FastifyReply) => {
            const [user] = await db
                .select()
                .from(users)
                .where(eq(users.id, request.user.id))
                .limit(1);

            if (!user) {
                return reply.status(404).send({ message: "User not found" });
            }

            const [linkedCompanies, acceptances, recentAuditEvents] =
                await Promise.all([
                    loadUserCompaniesForPrivacy(user.id, user.primaryCompanyId),
                    db
                        .select({
                            id: legalAcceptances.id,
                            documentType: legalAcceptances.documentType,
                            documentVersion: legalAcceptances.documentVersion,
                            acceptedAt: legalAcceptances.acceptedAt,
                        })
                        .from(legalAcceptances)
                        .where(eq(legalAcceptances.userId, user.id))
                        .orderBy(desc(legalAcceptances.acceptedAt)),
                    db
                        .select({
                            id: auditLogs.id,
                            action: auditLogs.action,
                            targetTable: auditLogs.targetTable,
                            statusCode: auditLogs.statusCode,
                            ipAddress: auditLogs.ipAddress,
                            createdAt: auditLogs.createdAt,
                        })
                        .from(auditLogs)
                        .where(eq(auditLogs.actorId, user.id))
                        .orderBy(desc(auditLogs.createdAt))
                        .limit(100),
                ]);

            return reply.status(200).send({
                exportedAt: new Date().toISOString(),
                legalNotice:
                    "Exportação em conformidade com o Art. 18, incisos II e V da LGPD (Lei nº 13.709/2018).",
                user: {
                    id: user.id,
                    name: user.name,
                    surname: user.surname,
                    username: user.username,
                    email: user.email,
                    emailVerified: user.emailVerified,
                    cpfMasked: maskCpf(user.cpf),
                    role: request.user.role,
                    active: user.active,
                    createdAt: user.createdAt,
                    anonymizedAt: user.anonymizedAt,
                },
                companies: linkedCompanies,
                legalAcceptances: acceptances,
                recentAuditEvents,
            });
        },
    );

    app.post(
        "/privacy/anonymize",
        {
            schema: {
                tags: ["Account", "LGPD"],
                summary:
                    "Anonymize and deactivate account while preserving statutory fiscal records (LGPD Art. 16 I & Art. 18 VI)",
                body: anonymizeBodySchema,
                response: {
                    200: anonymizeResponseSchema,
                    400: errorResponseSchema,
                    401: errorResponseSchema,
                },
            },
        },
        async (request: FastifyRequest, reply: FastifyReply) => {
            const { currentPassword } = anonymizeBodySchema.parse(request.body);
            const [user] = await db
                .select()
                .from(users)
                .where(eq(users.id, request.user.id))
                .limit(1);

            if (!user || !(await verifyPassword(currentPassword, user.password))) {
                return reply.status(401).send({ message: "Senha atual inválida." });
            }

            if (request.user.role === "administrator") {
                const activeSaasAdmins = await db
                    .select({ id: users.id })
                    .from(users)
                    .innerJoin(roles, eq(users.roleId, roles.id))
                    .where(
                        and(
                            eq(roles.name, "administrator"),
                            eq(users.active, true),
                        ),
                    );
                if (activeSaasAdmins.length <= 1) {
                    return reply.status(400).send({
                        message:
                            "Não é possível anonimizar o único administrador ativo da plataforma SaaS.",
                    });
                }
            }

            const shortId = user.id.replace(/-/g, "").slice(0, 12);
            const anonymizedAt = new Date();
            const previousEmail = user.email;

            await db.transaction(async (tx) => {
                await tx
                    .update(users)
                    .set({
                        name: "Usuário Anonimizado",
                        surname: "LGPD",
                        username: `anon_${shortId}`,
                        email: null,
                        emailVerified: false,
                        cpf: `ANON-${shortId}`,
                        active: false,
                        anonymizedAt,
                    })
                    .where(eq(users.id, user.id));

                if (previousEmail) {
                    await tx
                        .delete(emailVerificationCodes)
                        .where(
                            sql`lower(${emailVerificationCodes.email}) = ${previousEmail.toLowerCase()}`,
                        );
                }
            });

            const meta = extractRequestMeta(request);
            await recordAuditLog({
                actorId: user.id,
                actorRole: request.user.role,
                companyId: request.tenant?.activeCompanyId ?? null,
                action: "account.privacy.anonymize",
                targetTable: "users",
                targetId: user.id,
                ipAddress: meta.ipAddress,
                userAgent: meta.userAgent,
                statusCode: 200,
            });

            return reply.status(200).send({
                message: "Conta anonimizada e desativada com sucesso.",
                anonymizedAt,
                fiscalRetentionNotice:
                    "Registros fiscais e notas fiscais emitidas vinculadas à empresa são preservados por 5 anos em cumprimento de obrigação legal tributária (LGPD, Art. 16, I).",
            });
        },
    );
}

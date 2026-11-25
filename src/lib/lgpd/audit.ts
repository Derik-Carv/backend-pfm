import type { FastifyRequest } from "fastify";
import { db } from "@/database/index";
import { auditLogs } from "@/database/schema/schema";

export type AuditLogInput = {
    actorId?: string | null;
    actorRole?: string | null;
    companyId?: string | null;
    action: string;
    targetTable?: string | null;
    targetId?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
    metadata?: Record<string, unknown>;
    statusCode?: number | null;
};

export function extractRequestMeta(request: FastifyRequest) {
    const rawUserAgent = request.headers["user-agent"];
    return {
        ipAddress: request.ip || null,
        userAgent:
            typeof rawUserAgent === "string"
                ? rawUserAgent.slice(0, 300)
                : null,
    };
}

export async function recordAuditLog(entry: AuditLogInput): Promise<void> {
    try {
        await db.insert(auditLogs).values({
            actorId: entry.actorId ?? null,
            actorRole: entry.actorRole ?? null,
            companyId: entry.companyId ?? null,
            action: entry.action,
            targetTable: entry.targetTable ?? null,
            targetId: entry.targetId ?? null,
            ipAddress: entry.ipAddress ?? null,
            userAgent: entry.userAgent ?? null,
            metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
            statusCode: entry.statusCode ?? null,
        });
    } catch (error) {
        console.error(
            "Failed to persist LGPD audit log:",
            error instanceof Error ? error.message : "unknown error",
        );
    }
}

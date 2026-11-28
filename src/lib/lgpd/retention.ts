import { and, inArray, isNotNull, lt, ne, or } from "drizzle-orm";
import { db } from "@/database/index";
import {
    auditLogs,
    companyRegistrationRequests,
    emailVerificationCodes,
    financialIdempotencyKeys,
    legalAcceptances,
    securityIncidents,
} from "@/database/schema/schema";

export async function runLgpdRetentionCleanup() {
    const now = Date.now();
    const otpCutoff = new Date(now - 24 * 60 * 60 * 1000);
    const rejectedCutoff = new Date(now - 90 * 24 * 60 * 60 * 1000);
    const idempotencyCutoff = new Date(now - 30 * 24 * 60 * 60 * 1000);
    const auditLogCutoff = new Date(now - 5 * 365 * 24 * 60 * 60 * 1000);

    // 1. Expurga códigos OTP expirados ou já consumidos há mais de 24h
    const deletedOtp = await db
        .delete(emailVerificationCodes)
        .where(
            or(
                lt(emailVerificationCodes.expiresAt, otpCutoff),
                and(
                    isNotNull(emailVerificationCodes.consumedAt),
                    lt(emailVerificationCodes.consumedAt, otpCutoff),
                ),
            ),
        )
        .returning({ id: emailVerificationCodes.id });

    // 2. Garante remoção de hashes de senha residuais de solicitações já decididas
    const scrubbedRequests = await db
        .update(companyRegistrationRequests)
        .set({ adminPasswordHash: null })
        .where(
            and(
                ne(companyRegistrationRequests.status, "pending"),
                isNotNull(companyRegistrationRequests.adminPasswordHash),
            ),
        )
        .returning({ id: companyRegistrationRequests.id });

    // 3. Expurga solicitações rejeitadas há mais de 90 dias (limpando FK em legal_acceptances antes)
    const expiredRejected = await db
        .select({ id: companyRegistrationRequests.id })
        .from(companyRegistrationRequests)
        .where(
            and(
                eqStatusRejected(),
                lt(companyRegistrationRequests.updatedAt, rejectedCutoff),
            ),
        );

    let deletedRejectedRequests = 0;
    if (expiredRejected.length > 0) {
        const ids = expiredRejected.map((row) => row.id);
        deletedRejectedRequests = await db.transaction(async (tx) => {
            await tx
                .delete(legalAcceptances)
                .where(inArray(legalAcceptances.companyRequestId, ids));

            const deletedReqs = await tx
                .delete(companyRegistrationRequests)
                .where(inArray(companyRegistrationRequests.id, ids))
                .returning({ id: companyRegistrationRequests.id });
            return deletedReqs.length;
        });
    }

    // 4. Expurga logs de auditoria e incidentes de segurança com mais de 5 anos
    // e chaves de idempotência financeira expiradas (> 30 dias)
    const [deletedAuditLogs, deletedIncidents, deletedIdempotencyKeys] =
        await Promise.all([
            db
                .delete(auditLogs)
                .where(lt(auditLogs.createdAt, auditLogCutoff))
                .returning({ id: auditLogs.id }),
            db
                .delete(securityIncidents)
                .where(lt(securityIncidents.createdAt, auditLogCutoff))
                .returning({ id: securityIncidents.id }),
            db
                .delete(financialIdempotencyKeys)
                .where(lt(financialIdempotencyKeys.createdAt, idempotencyCutoff))
                .returning({ id: financialIdempotencyKeys.id }),
        ]);

    return {
        deletedOtpCodes: deletedOtp.length,
        scrubbedRequestHashes: scrubbedRequests.length,
        deletedRejectedRequests,
        deletedExpiredAuditLogs: deletedAuditLogs.length,
        deletedExpiredIncidents: deletedIncidents.length,
        deletedExpiredIdempotencyKeys: deletedIdempotencyKeys.length,
    };
}

function eqStatusRejected() {
    return and(
        ne(companyRegistrationRequests.status, "pending"),
        ne(companyRegistrationRequests.status, "approved"),
    );
}

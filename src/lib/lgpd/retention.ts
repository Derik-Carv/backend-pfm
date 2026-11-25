import { and, inArray, isNotNull, lt, ne, or } from "drizzle-orm";
import { db } from "@/database/index";
import {
    companyRegistrationRequests,
    emailVerificationCodes,
    legalAcceptances,
} from "@/database/schema/schema";

export async function runLgpdRetentionCleanup() {
    const now = Date.now();
    const otpCutoff = new Date(now - 24 * 60 * 60 * 1000);
    const rejectedCutoff = new Date(now - 90 * 24 * 60 * 60 * 1000);

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
        await db
            .delete(legalAcceptances)
            .where(inArray(legalAcceptances.companyRequestId, ids));

        const deletedReqs = await db
            .delete(companyRegistrationRequests)
            .where(inArray(companyRegistrationRequests.id, ids))
            .returning({ id: companyRegistrationRequests.id });
        deletedRejectedRequests = deletedReqs.length;
    }

    return {
        deletedOtpCodes: deletedOtp.length,
        scrubbedRequestHashes: scrubbedRequests.length,
        deletedRejectedRequests,
    };
}

function eqStatusRejected() {
    return and(ne(companyRegistrationRequests.status, "pending"), ne(companyRegistrationRequests.status, "approved"));
}

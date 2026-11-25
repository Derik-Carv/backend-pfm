import crypto from "node:crypto";
import { db } from "@/database/index";
import { emailVerificationCodes } from "@/database/schema/schema";
import { and, desc, eq, gt, isNull, lt, sql } from "drizzle-orm";

const OTP_RESEND_COOLDOWN_MS = 60_000;
const MAX_OTP_ATTEMPTS = 5;

export type VerificationPurpose = "register" | "company_register" | "password_reset";

export function normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
}

export function hashVerificationCode(
    email: string,
    purpose: VerificationPurpose,
    code: string,
): string {
    return crypto
        .createHash("sha256")
        .update(`${normalizeEmail(email)}:${purpose}:${code.trim()}`)
        .digest("hex");
}

export function generateSixDigitCode(): string {
    return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

export class EmailVerificationCodesRepository {
    async createCode(
        email: string,
        purpose: VerificationPurpose,
        code: string,
        ttlMinutes = 15,
    ) {
        const normalized = normalizeEmail(email);
        const now = new Date();
        const cooldownSince = new Date(now.getTime() - OTP_RESEND_COOLDOWN_MS);

        const [recentActive] = await db
            .select({ id: emailVerificationCodes.id })
            .from(emailVerificationCodes)
            .where(
                and(
                    eq(emailVerificationCodes.email, normalized),
                    eq(emailVerificationCodes.purpose, purpose),
                    isNull(emailVerificationCodes.consumedAt),
                    gt(emailVerificationCodes.createdAt, cooldownSince),
                ),
            )
            .limit(1);

        if (recentActive) {
            throw new Error("OTP_COOLDOWN_ACTIVE");
        }

        const expiresAt = new Date(now.getTime() + ttlMinutes * 60_000);
        const codeHash = hashVerificationCode(normalized, purpose, code);

        return await db.transaction(async (tx) => {
            // Invalida códigos anteriores ainda não consumidos
            await tx
                .update(emailVerificationCodes)
                .set({ consumedAt: now })
                .where(
                    and(
                        eq(emailVerificationCodes.email, normalized),
                        eq(emailVerificationCodes.purpose, purpose),
                        isNull(emailVerificationCodes.consumedAt),
                    ),
                );

            const [created] = await tx
                .insert(emailVerificationCodes)
                .values({
                    email: normalized,
                    purpose,
                    codeHash,
                    attempts: 0,
                    expiresAt,
                })
                .returning();

            return created;
        });
    }

    async verifyAndConsumeCode(
        email: string,
        purpose: VerificationPurpose,
        code: string,
    ): Promise<{ ok: true } | { ok: false; reason: "INVALID_OR_EXPIRED_CODE" }> {
        const normalized = normalizeEmail(email);
        const now = new Date();

        return await db.transaction(async (tx) => {
            const [record] = await tx
                .select()
                .from(emailVerificationCodes)
                .where(
                    and(
                        eq(emailVerificationCodes.email, normalized),
                        eq(emailVerificationCodes.purpose, purpose),
                        isNull(emailVerificationCodes.consumedAt),
                    ),
                )
                .orderBy(desc(emailVerificationCodes.createdAt))
                .limit(1);

            if (!record || record.expiresAt < now || record.attempts >= MAX_OTP_ATTEMPTS) {
                return { ok: false, reason: "INVALID_OR_EXPIRED_CODE" } as const;
            }

            const expected = Buffer.from(record.codeHash, "hex");
            const received = Buffer.from(
                hashVerificationCode(normalized, purpose, code),
                "hex",
            );

            const isMatch =
                expected.length === received.length &&
                crypto.timingSafeEqual(expected, received);

            if (!isMatch) {
                await tx
                    .update(emailVerificationCodes)
                    .set({ attempts: sql`${emailVerificationCodes.attempts} + 1` })
                    .where(
                        and(
                            eq(emailVerificationCodes.id, record.id),
                            isNull(emailVerificationCodes.consumedAt),
                            lt(emailVerificationCodes.attempts, MAX_OTP_ATTEMPTS),
                        ),
                    );
                return { ok: false, reason: "INVALID_OR_EXPIRED_CODE" } as const;
            }

            const [consumed] = await tx
                .update(emailVerificationCodes)
                .set({ consumedAt: now })
                .where(
                    and(
                        eq(emailVerificationCodes.id, record.id),
                        isNull(emailVerificationCodes.consumedAt),
                        lt(emailVerificationCodes.attempts, MAX_OTP_ATTEMPTS),
                        gt(emailVerificationCodes.expiresAt, now),
                    ),
                )
                .returning({ id: emailVerificationCodes.id });

            if (!consumed) {
                return { ok: false, reason: "INVALID_OR_EXPIRED_CODE" } as const;
            }

            return { ok: true } as const;
        });
    }
}

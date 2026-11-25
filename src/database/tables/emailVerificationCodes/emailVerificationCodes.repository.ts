import crypto from "node:crypto";
import { db } from "@/database/index";
import { emailVerificationCodes } from "@/database/schema/schema";
import { and, desc, eq, isNull } from "drizzle-orm";

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
        const expiresAt = new Date(now.getTime() + ttlMinutes * 60_000);
        const codeHash = hashVerificationCode(normalized, purpose, code);

        // Invalida códigos anteriores ainda não consumidos
        await db
            .update(emailVerificationCodes)
            .set({ consumedAt: now })
            .where(
                and(
                    eq(emailVerificationCodes.email, normalized),
                    eq(emailVerificationCodes.purpose, purpose),
                    isNull(emailVerificationCodes.consumedAt),
                ),
            );

        const [created] = await db
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
    }

    async verifyAndConsumeCode(
        email: string,
        purpose: VerificationPurpose,
        code: string,
    ): Promise<{ ok: true } | { ok: false; reason: "INVALID_OR_EXPIRED_CODE" }> {
        const normalized = normalizeEmail(email);

        const [record] = await db
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

        if (!record) {
            return { ok: false, reason: "INVALID_OR_EXPIRED_CODE" };
        }

        const now = new Date();
        if (record.expiresAt < now || record.attempts >= 5) {
            return { ok: false, reason: "INVALID_OR_EXPIRED_CODE" };
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
            await db
                .update(emailVerificationCodes)
                .set({ attempts: record.attempts + 1 })
                .where(eq(emailVerificationCodes.id, record.id));
            return { ok: false, reason: "INVALID_OR_EXPIRED_CODE" };
        }

        await db
            .update(emailVerificationCodes)
            .set({ consumedAt: now })
            .where(eq(emailVerificationCodes.id, record.id));

        return { ok: true };
    }
}

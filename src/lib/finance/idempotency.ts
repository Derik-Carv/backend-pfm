import { createHash } from "node:crypto";

const IDEMPOTENCY_KEY_REGEX = /^[A-Za-z0-9._:-]{8,128}$/;

export function extractIdempotencyKey(rawHeader: unknown): string {
    if (typeof rawHeader !== "string") {
        throw new Error("IDEMPOTENCY_KEY_REQUIRED");
    }
    const trimmed = rawHeader.trim();
    if (!IDEMPOTENCY_KEY_REGEX.test(trimmed)) {
        throw new Error("INVALID_IDEMPOTENCY_KEY");
    }
    return trimmed;
}

function canonicalize(value: unknown): unknown {
    if (typeof value === "bigint") {
        return value.toString();
    }
    if (Array.isArray(value)) {
        return value.map(canonicalize);
    }
    if (value && typeof value === "object" && !(value instanceof Date)) {
        const record = value as Record<string, unknown>;
        const sorted: Record<string, unknown> = {};
        for (const key of Object.keys(record).sort()) {
            const val = record[key];
            if (val !== undefined) {
                sorted[key] = canonicalize(val);
            }
        }
        return sorted;
    }
    if (value instanceof Date) {
        return value.toISOString();
    }
    return value;
}

/**
 * Hash SHA-256 determinístico para validar se uma Idempotency-Key reutilizada
 * traz exatamente o mesmo corpo de requisição.
 */
export function hashIdempotencyPayload(payload: unknown): string {
    const canonical = JSON.stringify(canonicalize(payload));
    return createHash("sha256").update(canonical).digest("hex");
}

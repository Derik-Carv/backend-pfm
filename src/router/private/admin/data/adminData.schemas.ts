import { z } from "zod";

export const adminTableNames = [
    "roles",
    "users",
    "clients",
    "movimentations",
    "types",
    "status-services",
    "services",
    "notes",
    "bundled",
] as const;

export const adminTableParamsSchema = z.object({
    table: z.enum(adminTableNames),
});

export const adminRecordParamsSchema = adminTableParamsSchema.extend({
    id: z.string().uuid(),
});

export const adminListQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: z.enum(["all", "active", "inactive"]).default("all"),
});

export const adminRecordBodySchema = z
    .record(z.string(), z.unknown())
    .refine((body) => !("id" in body), {
        message: "id cannot be changed through the administrative API",
    })
    .refine((body) => !("createdAt" in body || "updatedAt" in body), {
        message: "createdAt and updatedAt are controlled by the system",
    });

export const adminListResponseSchema = z.object({
    message: z.string(),
    table: z.string(),
    records: z.array(z.record(z.string(), z.unknown())),
    pagination: z.object({
        page: z.number(),
        limit: z.number(),
        total: z.number(),
        totalPages: z.number(),
        hasMore: z.boolean(),
    }),
});

export const adminRecordResponseSchema = z.object({
    message: z.string(),
    table: z.string(),
    record: z.record(z.string(), z.unknown()),
});

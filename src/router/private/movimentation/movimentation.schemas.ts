import { z } from "zod";

const movimentationItemSchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    nfId: z.string().uuid().nullable(),
    destinationUserId: z.string().uuid().nullable(),
    destinationClientId: z.string().uuid().nullable(),
    justify: z.string(),
    active: z.boolean(),
    createdAt: z.date(),
    updatedAt: z.date(),
});

export const createMovimentationSchema = z.object({
    name: z.string().trim().min(1).max(200),
    nfId: z.string().uuid().nullable().optional(),
    destinationUserId: z.string().uuid().nullable().optional(),
    destinationClientId: z.string().uuid().nullable().optional(),
    justify: z.string().trim().min(1).max(1000),
});

export const movimentationIdParamsSchema = z.object({
    id: z.string().uuid(),
});

export const movimentationResponseSchema = z.object({
    message: z.string(),
    movimentation: movimentationItemSchema,
});

export const movimentationListResponseSchema = z.object({
    message: z.string(),
    movimentations: z.array(movimentationItemSchema),
});

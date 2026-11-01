import { z } from "zod";

const typeItemSchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    active: z.boolean(),
    createdAt: z.date(),
    updatedAt: z.date(),
});

export const createTypeSchema = z.object({
    name: z.string().trim().min(2).max(100),
});

export const typeIdParamsSchema = z.object({
    id: z.string().uuid(),
});

export const getTypesResponseSchema = z.object({
    message: z.string(),
    types: z.array(typeItemSchema),
});

export const typeResponseSchema = z.object({
    message: z.string(),
    type: typeItemSchema,
});

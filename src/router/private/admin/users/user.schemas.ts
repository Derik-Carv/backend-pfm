import { z } from "zod";

const usersBaseSchema = z.object({
    name: z.string(),
    surname: z.string(),
    username: z.string(),
    roleId: z.string(),
    cpf: z.string(),
    createdAt: z.date(),
    updatedAt: z.date(),
});

export const getUserResponseSchema = z.object({
    message: z.string(),
    users: z.object({
        list: z.array(usersBaseSchema),
        pagination: z.object({
            page: z.number().int(),
            limit: z.number().int(),
            total: z.number().int(),
            totalPages: z.number().int(),
            hasMore: z.boolean(),
        }),
    }),
});

export const getUsersQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(10).default(10),
});

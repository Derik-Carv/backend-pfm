import { z } from "zod";

export const createRoleSchema = z
    .object({
        name: z
            .string({ message: "Name is required" })
            .trim()
            .min(2, { message: "Name must have at least 2 characters" })
            .max(100, { message: "Name can have at most 100 characters" })
            .toLowerCase(),
    })
    .strict();

const roleItemSchema = z.object({
    id: z.string(),
    name: z.string(),
    createdAt: z.date(),
    updatedAt: z.date(),
});

export const createRoleResponseSchema = z.object({
    message: z.string(),
    role: roleItemSchema,
});

export const getRolesResponseSchema = z.object({
    message: z.string(),
    roles: z.array(roleItemSchema),
});

export type CreateRoleInput = z.infer<typeof createRoleSchema>;
export type CreateRoleResponse = z.infer<typeof createRoleResponseSchema>;

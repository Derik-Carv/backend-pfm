import { z } from "zod";

export const getUserResponseSchema = z.object({
    message: z.string(),
    user: z.object({
        name: z.string(),
        surname: z.string(),
        username: z.string(),
        role: z.string(),
        cpf: z.string(),
        active: z.boolean(),
        createdAt: z.date(),
    }),
});

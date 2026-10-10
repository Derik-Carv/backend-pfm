import { z } from "zod";

export const getUserResponseSchema = z.object({
    message: z.string(),
    users: z.array(
        z.object({
            name: z.string(),
            surname: z.string(),
            username: z.string(),
            roleId: z.uuid(),
            cpf: z.string(),
            active: z.boolean(),
            createdAt: z.date(),
        }),
    ),
});

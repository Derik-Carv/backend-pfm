import { z } from "zod";

export const createUserSchema = z
    .object({
        name: z
            .string({ message: "Name is required" })
            .trim()
            .min(2, { message: "Name must have at least 2 characters" })
            .max(100, { message: "Name can have at most 100 characters" }),

        surname: z
            .string({ message: "Surname is required" })
            .trim()
            .min(2, { message: "Surname must have at least 2 characters" })
            .max(100, { message: "Surname can have at most 100 characters" }),

        username: z
            .string({ message: "Username is required" })
            .trim()
            .min(3, { message: "Username must have at least 3 characters" })
            .max(50, { message: "Username can have at most 50 characters" })
            .toLowerCase(),

        cpf: z
            .string({ message: "CPF is required" })
            .trim()
            .transform((val) => val.replace(/\D/g, ""))
            .refine((val) => val.length === 11, {
                message: "CPF must contain exactly 11 digits",
            }),
    })
    .strict();

export const createUserResponseSchema = z.object({
    message: z.string(),
    user: z.object({
        name: z.string(),
        surname: z.string(),
        username: z.string(),
        cpf: z.string(),
        createdAt: z.string(),
    }),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type CreateUserResponse = z.infer<typeof createUserResponseSchema>;

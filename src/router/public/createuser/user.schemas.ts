import { cpfClean } from "@/utils/checkCpf";
import { z } from "zod";

export const createUserSchema = z
    .object({
        name: z
            .string({ message: "Name is required" })
            .trim()
            .min(2, { message: "Name must have at least 2 characters" })
            .max(100, { message: "Name can have at most 100 characters" })
            .toLowerCase(),

        surname: z
            .string({ message: "Surname is required" })
            .trim()
            .min(2, { message: "Surname must have at least 2 characters" })
            .max(100, { message: "Surname can have at most 100 characters" })
            .toLowerCase(),

        username: z
            .string({ message: "Username is required" })
            .trim()
            .min(3, { message: "Username must have at least 3 characters" })
            .max(50, { message: "Username can have at most 50 characters" })
            .toLowerCase(),

        password: z
            .string()
            .trim()
            .min(8, { message: "Password must have at least 8 characters" })
            .max(50, { message: "Password can have at most 50 characters" }),

        cpf: z
            .string({ message: "CPF is required" })
            .trim()
            .transform((val) => cpfClean(val))
            .refine((val) => val.length === 11, {
                message: "CPF must contain exactly 11 digits",
            }),
        roleId: z.string({ message: "Role id is required" }).trim(),
    })
    .strict();

export const createUserResponseSchema = z.object({
    message: z.string(),
    user: z.object({
        name: z.string(),
        surname: z.string(),
        username: z.string(),
        role: z.string(),
        cpf: z.string(),
        createdAt: z.coerce.date(),
    }),
});

export const getUserResponseSchema = z.object({
    message: z.string(),
    user: z.object({
        name: z.string(),
        surname: z.string(),
        username: z.string(),
        role: z.string(),
        cpf: z.string(),
        createdAt: z.date(),
    }),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type CreateUserResponse = z.infer<typeof createUserResponseSchema>;

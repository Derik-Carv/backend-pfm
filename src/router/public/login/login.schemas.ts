import { z } from "zod";

export const loginSchema = z
    .object({
        username: z
            .string({ message: "username is required" })
            .trim()
            .min(1)
            .max(150, { message: "Username can have maximum 150 characters" }),
        password: z
            .string({ message: "password is required" })
            .min(6, { message: "Password must have at least 6 characters" })
            .max(128, { message: "Password can have maximum 128 characters" }),
    })
    .strict();

export const loginResponseOkSchema = z
    .object({
        message: z.string(),
        token: z.string(),
        passwordChangeRequired: z.boolean(),
        legalAcceptanceRequired: z.boolean(),
    })
    .strict();

export type LoginUserInput = z.infer<typeof loginSchema>;

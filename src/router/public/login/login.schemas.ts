import { z } from "zod";

export const loginSchema = z
    .object({
        username: z
            .string({ message: "username is required" })
            .trim()
            .min(1)
            .max(50, { message: "Username can have maximun 50 characters" }),
        password: z
            .string({ message: "password is required" })
            .trim()
            .min(6, { message: "Password must have at least 6 characters" })
            .max(50, { message: "Password can have maximun 50 characters" }),
    })
    .strict();

export const loginResponseOkSchema = z
    .object({
        message: z.string(),
        token: z.string(),
    })
    .strict();

export type LoginUserInput = z.infer<typeof loginSchema>;

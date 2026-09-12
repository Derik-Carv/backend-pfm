import { z } from "zod";

export const loginSchema = z.object({
    username: z
        .string()
        .max(50, { message: "Username can have maximun 50 characters" }),
    password: z
        .string()
        .min(6, { message: "Password must have at least 6 characters" })
        .max(50, { message: "Password can have maximun 50 characters" }),
});

export const loginResponseSchema = z.object({
    message: z.string(),
});

export const healthResponseSchema = z.object({
    status: z.string(),
});

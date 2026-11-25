import { z } from "zod";

export const forgotPasswordSchema = z
    .object({
        email: z
            .string({ message: "Email is required" })
            .trim()
            .email({ message: "Invalid email format" })
            .toLowerCase(),
    })
    .strict();

export const forgotPasswordResponseSchema = z.object({
    message: z.string(),
    expiresInMinutes: z.number(),
});

export const resetPasswordSchema = z
    .object({
        email: z
            .string({ message: "Email is required" })
            .trim()
            .email({ message: "Invalid email format" })
            .toLowerCase(),
        code: z
            .string({ message: "Verification code is required" })
            .trim()
            .regex(/^\d{6}$/, {
                message: "Verification code must have 6 digits",
            }),
        newPassword: z
            .string({ message: "New password is required" })
            .trim()
            .min(8, { message: "New password must have at least 8 characters" })
            .max(100, { message: "New password can have at most 100 characters" }),
    })
    .strict();

export const resetPasswordResponseSchema = z.object({
    message: z.string(),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

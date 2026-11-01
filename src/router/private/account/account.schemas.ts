import { z } from "zod";

export const changePasswordSchema = z
    .object({
        currentPassword: z.string().min(1),
        newPassword: z.string().min(8).max(100),
    })
    .refine((data) => data.currentPassword !== data.newPassword, {
        message: "New password must be different from current password",
        path: ["newPassword"],
    });

export const changePasswordResponseSchema = z.object({
    message: z.string(),
    passwordChangeRequired: z.boolean(),
});

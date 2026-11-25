import { z } from "zod";
import { cpfClean } from "@/utils/checkCpf";

export const requestCompanyCodeBodySchema = z
    .object({
        email: z
            .string({ message: "Email is required" })
            .trim()
            .email({ message: "Invalid email format" })
            .toLowerCase(),
        cnpj: z.string().trim().optional(),
        name: z.string().trim().min(1).max(100).optional(),
    })
    .strict();

export const requestCompanyCodeResponseSchema = z.object({
    message: z.string(),
    expiresInMinutes: z.number(),
});

export const createCompanyRequestBodySchema = z
    .object({
        registeredCompanyName: z.string().trim().min(2).max(200),
        tradeName: z.string().trim().min(2).max(200),
        cnpj: z
            .string({ message: "CNPJ is required" })
            .trim()
            .transform((val) => val.replace(/\D/g, ""))
            .refine((val) => val.length === 14, {
                message: "CNPJ must contain 14 digits",
            }),
        companyEmail: z.string().trim().email().toLowerCase().optional(),
        phone: z.string().trim().max(30).optional(),
        adminName: z.string().trim().min(2).max(100),
        adminSurname: z.string().trim().min(2).max(100),
        adminEmail: z
            .string({ message: "Admin email is required" })
            .trim()
            .email({ message: "Valid admin email is required" })
            .toLowerCase(),
        adminCpf: z
            .string({ message: "Admin CPF is required" })
            .trim()
            .transform((val) => cpfClean(val))
            .refine((val) => val.length === 11, {
                message: "CPF must contain exactly 11 digits",
            }),
        adminPassword: z
            .string()
            .trim()
            .min(8, { message: "Password must have at least 8 characters" })
            .max(100),
        code: z
            .string({ message: "Verification code is required" })
            .trim()
            .regex(/^\d{6}$/, {
                message: "Verification code must have 6 digits",
            }),
    })
    .strict();

export const companyRequestSummarySchema = z.object({
    id: z.string().uuid(),
    registeredCompanyName: z.string(),
    tradeName: z.string(),
    cnpj: z.string(),
    adminName: z.string(),
    adminSurname: z.string(),
    adminEmail: z.string(),
    status: z.string(),
    createdAt: z.date(),
});

export const createCompanyRequestResponseSchema = z.object({
    message: z.string(),
    request: companyRequestSummarySchema,
});

export type RequestCompanyCodeInput = z.infer<typeof requestCompanyCodeBodySchema>;
export type CreateCompanyRequestInput = z.infer<typeof createCompanyRequestBodySchema>;

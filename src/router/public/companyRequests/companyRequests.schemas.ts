import { z } from "zod";
import { cpfClean } from "@/utils/checkCpf";
import { cnpjClean } from "@/utils/checkCnpj";

export const accountTypeEnum = z.enum(["business", "personal"]);

export const requestCompanyCodeBodySchema = z
    .object({
        accountType: accountTypeEnum.default("business"),
        email: z
            .string({ message: "Email is required" })
            .trim()
            .email({ message: "Invalid email format" })
            .toLowerCase(),
        cnpj: z.string().trim().optional(),
        cpf: z.string().trim().optional(),
        name: z.string().trim().min(1).max(100).optional(),
    })
    .strict();

export const requestCompanyCodeResponseSchema = z.object({
    message: z.string(),
    expiresInMinutes: z.number(),
});

export const createCompanyRequestBodySchema = z
    .object({
        accountType: accountTypeEnum.default("business"),
        registeredCompanyName: z.string().trim().min(2).max(200).optional(),
        tradeName: z.string().trim().min(2).max(200).optional(),
        cnpj: z
            .string()
            .trim()
            .transform((val) => cnpjClean(val))
            .optional(),
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
            .min(8, { message: "Password must have at least 8 characters" })
            .max(128),
        code: z
            .string({ message: "Verification code is required" })
            .trim()
            .regex(/^\d{6}$/, {
                message: "Verification code must have 6 digits",
            }),
        acceptedTerms: z.literal(true, {
            message: "Terms of use acceptance is required",
        }),
        acceptedPrivacy: z.literal(true, {
            message: "Privacy policy acceptance is required",
        }),
    })
    .strict()
    .superRefine((data, ctx) => {
        if (data.accountType === "business") {
            if (!data.registeredCompanyName) {
                ctx.addIssue({
                    code: "custom",
                    path: ["registeredCompanyName"],
                    message: "Registered company name is required",
                });
            }
            if (!data.tradeName) {
                ctx.addIssue({
                    code: "custom",
                    path: ["tradeName"],
                    message: "Trade name is required",
                });
            }
            if (!data.cnpj || data.cnpj.length !== 14) {
                ctx.addIssue({
                    code: "custom",
                    path: ["cnpj"],
                    message: "CNPJ must contain 14 digits",
                });
            }
        }
    });

export const companyRequestSummarySchema = z.object({
    id: z.string().uuid(),
    accountType: accountTypeEnum,
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
    autoApproved: z.boolean().optional(),
    username: z.string().optional(),
    request: companyRequestSummarySchema,
});

export type RequestCompanyCodeInput = z.infer<typeof requestCompanyCodeBodySchema>;
export type CreateCompanyRequestInput = z.infer<typeof createCompanyRequestBodySchema>;

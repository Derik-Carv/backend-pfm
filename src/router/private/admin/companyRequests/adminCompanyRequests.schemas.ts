import { z } from "zod";

export const listCompanyRequestsQuerySchema = z.object({
    status: z.enum(["pending", "approved", "rejected", "all"]).default("pending"),
});

export const companyRequestIdParamsSchema = z.object({
    id: z.string().uuid(),
});

export const rejectCompanyRequestBodySchema = z
    .object({
        reason: z.string().trim().min(3).max(500),
    })
    .strict();

export const adminCompanyRequestItemSchema = z.object({
    id: z.string().uuid(),
    registeredCompanyName: z.string(),
    tradeName: z.string(),
    cnpj: z.string(),
    companyEmail: z.string().nullable(),
    phone: z.string().nullable(),
    adminName: z.string(),
    adminSurname: z.string(),
    adminEmail: z.string(),
    adminCpf: z.string(),
    status: z.string(),
    rejectionReason: z.string().nullable(),
    reviewedBy: z.string().uuid().nullable(),
    reviewedAt: z.date().nullable(),
    approvedCompanyId: z.string().uuid().nullable(),
    approvedUserId: z.string().uuid().nullable(),
    createdAt: z.date(),
    updatedAt: z.date(),
});

export const listCompanyRequestsResponseSchema = z.object({
    message: z.string(),
    requests: z.array(adminCompanyRequestItemSchema),
});

export const approveCompanyRequestResponseSchema = z.object({
    message: z.string(),
    company: z.object({
        id: z.string().uuid(),
        registeredCompanyName: z.string(),
        tradeName: z.string(),
        cnpj: z.string(),
        email: z.string().nullable().optional(),
        phone: z.string().nullable().optional(),
        motherId: z.string().uuid().nullable().optional(),
        active: z.boolean(),
        createdAt: z.date(),
        updatedAt: z.date(),
    }),
    adminUser: z.object({
        id: z.string().uuid(),
        username: z.string(),
        email: z.string(),
        role: z.string(),
    }),
});

export const rejectCompanyRequestResponseSchema = z.object({
    message: z.string(),
    request: adminCompanyRequestItemSchema,
});

export type ListCompanyRequestsQuery = z.infer<typeof listCompanyRequestsQuerySchema>;
export type RejectCompanyRequestInput = z.infer<typeof rejectCompanyRequestBodySchema>;

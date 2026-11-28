import { z } from "zod";

export const adminSystemMetricsResponseSchema = z.object({
    message: z.string(),
    data: z.object({
        systemHealth: z.object({
            status: z.enum(["healthy", "degraded", "down"]),
            uptimeSeconds: z.number(),
            databaseConnection: z.boolean(),
            memoryUsageMb: z.number(),
            environment: z.string(),
        }),
        stats: z.object({
            totalCompanies: z.number(),
            totalMothers: z.number(),
            totalBranches: z.number(),
            totalUsers: z.number(),
            totalClients: z.number(),
            totalServices: z.number(),
            totalNf: z.number(),
            estimatedDailyAccess: z.number(),
        }),
    }),
});

export const companyHierarchyItemSchema = z.object({
    id: z.string().uuid(),
    registeredCompanyName: z.string(),
    tradeName: z.string(),
    cnpj: z.string(),
    accountType: z.enum(["business", "personal"]).optional(),
    allowManualFinanceCodes: z.boolean().optional(),
    email: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    active: z.boolean(),
    createdAt: z.date(),
    branchesCount: z.number(),
    usersCount: z.number(),
    clientsCount: z.number(),
    servicesCount: z.number(),
    branches: z.array(
        z.object({
            id: z.string().uuid(),
            registeredCompanyName: z.string(),
            tradeName: z.string(),
            cnpj: z.string(),
            allowManualFinanceCodes: z.boolean().optional(),
            email: z.string().nullable().optional(),
            phone: z.string().nullable().optional(),
            active: z.boolean(),
            createdAt: z.date(),
            usersCount: z.number(),
            clientsCount: z.number(),
            servicesCount: z.number(),
        }),
    ),
});

export const adminHierarchyResponseSchema = z.object({
    message: z.string(),
    mothers: z.array(companyHierarchyItemSchema),
});

export const adminCompanyClientsQuerySchema = z.object({
    companyId: z.string().uuid(),
});

export const adminCompanyClientsResponseSchema = z.object({
    message: z.string(),
    clients: z.array(
        z.object({
            id: z.string().uuid(),
            registeredCompanyName: z.string(),
            tradeName: z.string(),
            cnpj: z.string().nullable().optional(),
            cpf: z.string().nullable().optional(),
            email: z.string().nullable().optional(),
            active: z.boolean(),
            createdAt: z.date(),
        }),
    ),
});

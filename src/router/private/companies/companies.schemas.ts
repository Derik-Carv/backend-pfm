import { z } from "zod";

export const companyAdminRolesEnum = z.enum([
    "company_admin",
    "manager",
    "finance",
    "observer",
    "colaborator",
]);

export const createMotherAdminInputSchema = z.object({
    name: z.string().min(2),
    surname: z.string().min(2),
    cpf: z.string().min(11).max(14),
    password: z.string().min(6),
    username: z.string().min(3).optional(),
});

export const createMotherCompanyBodySchema = z.object({
    registeredCompanyName: z.string().min(2),
    tradeName: z.string().min(2),
    cnpj: z.string().min(14).max(18),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    admin: createMotherAdminInputSchema.optional(),
});

export const createBranchCompanyBodySchema = z.object({
    registeredCompanyName: z.string().min(2),
    tradeName: z.string().min(2),
    cnpj: z.string().min(14).max(18),
    email: z.string().email().optional(),
    phone: z.string().optional(),
});

export const companyIdParamsSchema = z.object({
    id: z.string().uuid(),
});

export const updateCompanyBodySchema = z.object({
    registeredCompanyName: z.string().min(2).optional(),
    tradeName: z.string().min(2).optional(),
    email: z.string().email().nullable().optional(),
    phone: z.string().nullable().optional(),
    active: z.boolean().optional(),
});

export const companyResponseSchema = z.object({
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
});

export const companiesListResponseSchema = z.object({
    message: z.string(),
    companies: z.array(companyResponseSchema),
});

export const singleCompanyResponseSchema = z.object({
    message: z.string(),
    company: companyResponseSchema,
    adminUser: z
        .object({
            id: z.string().uuid(),
            username: z.string(),
            role: z.string(),
        })
        .optional(),
});

export const userAccessibleCompaniesResponseSchema = z.object({
    message: z.string(),
    activeCompanyId: z.string().uuid().optional(),
    isMother: z.boolean(),
    isConsolidated: z.boolean(),
    companies: z.array(companyResponseSchema),
});

export const createCompanyUserBodySchema = z.object({
    name: z.string().min(2),
    surname: z.string().min(2),
    cpf: z.string().min(11).max(14),
    password: z.string().min(6),
    roleName: companyAdminRolesEnum,
    companyId: z.string().uuid().optional(),
    username: z.string().min(3).optional(),
});

export const updateCompanyUserBodySchema = z.object({
    name: z.string().min(2).optional(),
    surname: z.string().min(2).optional(),
    roleName: companyAdminRolesEnum.optional(),
    companyId: z.string().uuid().optional(),
    active: z.boolean().optional(),
    password: z.string().min(6).optional(),
});

export const companyUserItemSchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    surname: z.string(),
    username: z.string(),
    cpf: z.string(),
    roleId: z.string().uuid(),
    roleName: z.string(),
    primaryCompanyId: z.string().uuid().nullable(),
    companyName: z.string().nullable().optional(),
    active: z.boolean(),
    passwordChangeRequired: z.boolean(),
    createdAt: z.date(),
});

export const companyUsersListResponseSchema = z.object({
    message: z.string(),
    users: z.array(companyUserItemSchema),
});

export const singleCompanyUserResponseSchema = z.object({
    message: z.string(),
    user: companyUserItemSchema,
});

export type CreateMotherCompanyInput = z.infer<typeof createMotherCompanyBodySchema>;
export type CreateBranchCompanyInput = z.infer<typeof createBranchCompanyBodySchema>;
export type UpdateCompanyInput = z.infer<typeof updateCompanyBodySchema>;
export type CreateCompanyUserInput = z.infer<typeof createCompanyUserBodySchema>;
export type UpdateCompanyUserInput = z.infer<typeof updateCompanyUserBodySchema>;

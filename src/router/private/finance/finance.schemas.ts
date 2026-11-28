import { z } from "zod";

export const uuidSchema = z.string().uuid();

export function isValidIsoCalendarDate(value: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
    }
    const [yearStr, monthStr, dayStr] = value.split("-");
    const year = Number(yearStr);
    const month = Number(monthStr);
    const day = Number(dayStr);
    if (month < 1 || month > 12 || day < 1 || day > 31) {
        return false;
    }
    const parsed = new Date(Date.UTC(year, month - 1, day));
    return (
        parsed.getUTCFullYear() === year &&
        parsed.getUTCMonth() === month - 1 &&
        parsed.getUTCDate() === day
    );
}

export const isoDateSchema = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato YYYY-MM-DD")
    .refine(isValidIsoCalendarDate, "Data de calendário inválida");

export const positiveCentsSchema = z
    .number()
    .int("Valor em centavos deve ser inteiro")
    .positive("Valor deve ser maior que zero")
    .max(900_000_000_000_000);

export const nonNegativeCentsSchema = z
    .number()
    .int("Valor em centavos deve ser inteiro")
    .min(0, "Valor não pode ser negativo")
    .max(900_000_000_000_000);

export const signedCentsSchema = z
    .number()
    .int("Valor em centavos deve ser inteiro")
    .min(-900_000_000_000_000)
    .max(900_000_000_000_000);

export const accountTypeEnum = z.enum([
    "checking",
    "savings",
    "cash",
    "gateway",
    "credit_card",
]);

export const categoryKindEnum = z.enum([
    "revenue",
    "deduction",
    "direct_cost",
    "operating_expense",
    "financial_result",
    "transfer",
]);

export const dreGroupEnum = z.enum([
    "gross_revenue",
    "taxes_and_deductions",
    "cogs",
    "sales_marketing",
    "ga_admin",
    "payroll",
    "financial_income",
    "financial_expense",
    "non_operational",
]);

export const entryTypeEnum = z.enum(["receivable", "payable"]);

export const entryStatusEnum = z.enum([
    "draft",
    "pending",
    "partially_paid",
    "paid",
    "overdue",
    "cancelled",
]);

export const paymentMethodEnum = z.enum([
    "pix",
    "boleto",
    "bank_transfer",
    "credit_card",
    "debit_card",
    "cash",
    "other",
]);

export const idParamsSchema = z.object({
    id: uuidSchema,
});

export const serviceIdParamsSchema = z.object({
    serviceId: uuidSchema,
});

// ---------------- Accounts ----------------
export const createAccountBodySchema = z.object({
    name: z.string().trim().min(2).max(120),
    type: accountTypeEnum,
    bankCode: z.string().trim().max(10).nullable().optional(),
    agencyMasked: z.string().trim().max(30).nullable().optional(),
    accountMasked: z.string().trim().max(40).nullable().optional(),
    initialBalanceCents: signedCentsSchema.default(0),
    initialBalanceDate: isoDateSchema,
});

export const updateAccountBodySchema = z.object({
    name: z.string().trim().min(2).max(120).optional(),
    bankCode: z.string().trim().max(10).nullable().optional(),
    agencyMasked: z.string().trim().max(30).nullable().optional(),
    accountMasked: z.string().trim().max(40).nullable().optional(),
    active: z.boolean().optional(),
});

export const accountResponseSchema = z.object({
    id: uuidSchema,
    companyId: uuidSchema,
    name: z.string(),
    type: accountTypeEnum,
    bankCode: z.string().nullable(),
    agencyMasked: z.string().nullable(),
    accountMasked: z.string().nullable(),
    initialBalanceCents: z.number().int(),
    initialBalanceDate: z.string(),
    currentBalanceCents: z.number().int(),
    active: z.boolean(),
    createdAt: z.date(),
    updatedAt: z.date(),
});

export const accountsListResponseSchema = z.object({
    message: z.string(),
    accounts: z.array(accountResponseSchema),
    totalBalanceCents: z.number().int(),
});

export const singleAccountResponseSchema = z.object({
    message: z.string(),
    account: accountResponseSchema,
});

// ---------------- Categories ----------------
export const createCategoryBodySchema = z.object({
    parentId: uuidSchema.nullable().optional(),
    code: z
        .string()
        .trim()
        .min(1)
        .max(30)
        .regex(/^[A-Za-z0-9._-]+$/)
        .optional(),
    name: z.string().trim().min(2).max(120),
    kind: categoryKindEnum,
    dreGroup: dreGroupEnum.nullable().optional(),
});

export const updateCategoryBodySchema = z.object({
    parentId: uuidSchema.nullable().optional(),
    name: z.string().trim().min(2).max(120).optional(),
    kind: categoryKindEnum.optional(),
    dreGroup: dreGroupEnum.nullable().optional(),
    active: z.boolean().optional(),
});

export const categoryResponseSchema = z.object({
    id: uuidSchema,
    companyId: uuidSchema,
    parentId: uuidSchema.nullable(),
    code: z.string(),
    name: z.string(),
    kind: categoryKindEnum,
    dreGroup: dreGroupEnum.nullable(),
    isSystem: z.boolean(),
    active: z.boolean(),
    createdAt: z.date(),
    updatedAt: z.date(),
});

export const categoriesListResponseSchema = z.object({
    message: z.string(),
    categories: z.array(categoryResponseSchema),
});

export const singleCategoryResponseSchema = z.object({
    message: z.string(),
    category: categoryResponseSchema,
});

// ---------------- Cost Centers ----------------
export const createCostCenterBodySchema = z.object({
    code: z
        .string()
        .trim()
        .min(1)
        .max(20)
        .regex(/^[A-Za-z0-9._-]+$/)
        .optional(),
    name: z.string().trim().min(2).max(120),
});

export const updateCostCenterBodySchema = z.object({
    name: z.string().trim().min(2).max(120).optional(),
    active: z.boolean().optional(),
});

export const costCenterResponseSchema = z.object({
    id: uuidSchema,
    companyId: uuidSchema,
    code: z.string(),
    name: z.string(),
    active: z.boolean(),
    createdAt: z.date(),
    updatedAt: z.date(),
});

export const costCentersListResponseSchema = z.object({
    message: z.string(),
    costCenters: z.array(costCenterResponseSchema),
});

export const singleCostCenterResponseSchema = z.object({
    message: z.string(),
    costCenter: costCenterResponseSchema,
});

// ---------------- Counterparties (Registered Clients/Suppliers) ----------------
export const listCounterpartiesQuerySchema = z.object({
    search: z.string().trim().max(120).optional(),
    limit: z.coerce.number().int().min(1).max(50).default(30),
});

export const counterpartyItemSchema = z.object({
    id: uuidSchema,
    companyId: uuidSchema.nullable(),
    tradeName: z.string(),
    registeredCompanyName: z.string(),
    document: z.string().nullable(),
});

export const counterpartiesListResponseSchema = z.object({
    message: z.string(),
    counterparties: z.array(counterpartyItemSchema),
});

// ---------------- Entries & Settlements ----------------
export const listEntriesQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    entryType: entryTypeEnum.optional(),
    status: entryStatusEnum.optional(),
    categoryId: uuidSchema.optional(),
    costCenterId: uuidSchema.optional(),
    clientId: uuidSchema.optional(),
    serviceId: uuidSchema.optional(),
    nfId: uuidSchema.optional(),
    dueFrom: isoDateSchema.optional(),
    dueTo: isoDateSchema.optional(),
    competenceFrom: isoDateSchema.optional(),
    competenceTo: isoDateSchema.optional(),
    excludeIntercompany: z
        .enum(["true", "false"])
        .transform((v) => v === "true")
        .optional(),
    search: z.string().trim().max(120).optional(),
});

export const createEntryBodySchema = z
    .object({
        entryType: entryTypeEnum,
        status: z.enum(["draft", "pending"]).default("pending"),
        description: z.string().trim().min(2).max(240),
        documentNumber: z.string().trim().max(80).nullable().optional(),
        notes: z.string().trim().max(1000).nullable().optional(),
        clientId: uuidSchema.nullable().optional(),
        counterpartyName: z.string().trim().max(120).nullable().optional(),
        serviceId: uuidSchema.nullable().optional(),
        nfId: uuidSchema.nullable().optional(),
        categoryId: uuidSchema,
        costCenterId: uuidSchema.nullable().optional(),
        competenceDate: isoDateSchema,
        issueDate: isoDateSchema,
        dueDate: isoDateSchema,
        originalAmountCents: positiveCentsSchema,
        discountCents: nonNegativeCentsSchema.default(0),
        interestCents: nonNegativeCentsSchema.default(0),
        fineCents: nonNegativeCentsSchema.default(0),
        totalInstallments: z.number().int().min(1).max(60).default(1),
        installmentDueDay: z.number().int().min(1).max(31).nullable().optional(),
        isIntercompany: z.boolean().default(false),
        counterpartyCompanyId: uuidSchema.nullable().optional(),
    })
    .superRefine((data, ctx) => {
        if (
            data.totalInstallments > 1 &&
            (data.installmentDueDay === undefined || data.installmentDueDay === null)
        ) {
            ctx.addIssue({
                code: "custom",
                path: ["installmentDueDay"],
                message:
                    "Informe o dia do mês de vencimento (1 a 31) para lançamentos parcelados.",
            });
        }
    });

export const createEntryFromServiceBodySchema = z
    .object({
        categoryId: uuidSchema.optional(),
        costCenterId: uuidSchema.nullable().optional(),
        nfId: uuidSchema.nullable().optional(),
        dueDate: isoDateSchema.optional(),
        competenceDate: isoDateSchema.optional(),
        issueDate: isoDateSchema.optional(),
        totalInstallments: z.number().int().min(1).max(60).default(1),
        installmentDueDay: z.number().int().min(1).max(31).nullable().optional(),
        description: z.string().trim().min(2).max(240).optional(),
        notes: z.string().trim().max(1000).nullable().optional(),
    })
    .superRefine((data, ctx) => {
        if (
            data.totalInstallments > 1 &&
            (data.installmentDueDay === undefined || data.installmentDueDay === null)
        ) {
            ctx.addIssue({
                code: "custom",
                path: ["installmentDueDay"],
                message:
                    "Informe o dia do mês de vencimento (1 a 31) para lançamentos parcelados.",
            });
        }
    });

export const updateEntryBodySchema = z.object({
    status: z.enum(["draft", "pending"]).optional(),
    description: z.string().trim().min(2).max(240).optional(),
    documentNumber: z.string().trim().max(80).nullable().optional(),
    notes: z.string().trim().max(1000).nullable().optional(),
    clientId: uuidSchema.optional(),
    counterpartyName: z.string().trim().max(120).nullable().optional(),
    categoryId: uuidSchema.optional(),
    costCenterId: uuidSchema.nullable().optional(),
    competenceDate: isoDateSchema.optional(),
    issueDate: isoDateSchema.optional(),
    dueDate: isoDateSchema.optional(),
    originalAmountCents: positiveCentsSchema.optional(),
    discountCents: nonNegativeCentsSchema.optional(),
    interestCents: nonNegativeCentsSchema.optional(),
    fineCents: nonNegativeCentsSchema.optional(),
});

export const cancelEntryBodySchema = z.object({
    reason: z.string().trim().min(5).max(500),
});

export const settleEntryBodySchema = z.object({
    accountId: uuidSchema,
    paymentMethod: paymentMethodEnum,
    settledAt: z.string().datetime().optional(),
    principalCents: positiveCentsSchema,
    interestCents: nonNegativeCentsSchema.default(0),
    fineCents: nonNegativeCentsSchema.default(0),
    discountCents: nonNegativeCentsSchema.default(0),
    gatewayFeeCents: nonNegativeCentsSchema.default(0),
    notes: z.string().trim().max(500).nullable().optional(),
});

export const reverseSettlementBodySchema = z.object({
    reason: z.string().trim().min(5).max(500),
    settledAt: z.string().datetime().optional(),
});

export const settlementResponseSchema = z.object({
    id: uuidSchema,
    companyId: uuidSchema,
    entryId: uuidSchema,
    accountId: uuidSchema,
    accountName: z.string().nullable().optional(),
    settlementType: z.enum(["payment", "reversal"]),
    reversedSettlementId: uuidSchema.nullable(),
    paymentMethod: paymentMethodEnum,
    settledAt: z.string(),
    principalCents: z.number().int(),
    interestCents: z.number().int(),
    fineCents: z.number().int(),
    discountCents: z.number().int(),
    gatewayFeeCents: z.number().int(),
    totalSettledCents: z.number().int(),
    notes: z.string().nullable(),
    createdBy: uuidSchema,
    createdAt: z.string(),
});

export const entryResponseSchema = z.object({
    id: uuidSchema,
    companyId: uuidSchema,
    entryType: entryTypeEnum,
    status: entryStatusEnum,
    description: z.string(),
    documentNumber: z.string().nullable(),
    notes: z.string().nullable(),
    clientId: uuidSchema.nullable(),
    counterpartyName: z.string().nullable(),
    counterpartyDocument: z.string().nullable(),
    serviceId: uuidSchema.nullable(),
    nfId: uuidSchema.nullable(),
    categoryId: uuidSchema,
    categoryCode: z.string().nullable().optional(),
    categoryName: z.string().nullable().optional(),
    costCenterId: uuidSchema.nullable(),
    costCenterName: z.string().nullable().optional(),
    competenceDate: z.string(),
    issueDate: z.string(),
    dueDate: z.string(),
    paidAt: z.string().nullable(),
    originalAmountCents: z.number().int(),
    discountCents: z.number().int(),
    interestCents: z.number().int(),
    fineCents: z.number().int(),
    netAmountCents: z.number().int(),
    settledAmountCents: z.number().int(),
    remainingAmountCents: z.number().int(),
    installmentNumber: z.number().int(),
    totalInstallments: z.number().int(),
    installmentGroupId: uuidSchema.nullable(),
    isIntercompany: z.boolean(),
    counterpartyCompanyId: uuidSchema.nullable(),
    createdBy: uuidSchema,
    cancelledBy: uuidSchema.nullable(),
    cancelledAt: z.string().nullable(),
    cancelReason: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
});

export const entriesListResponseSchema = z.object({
    message: z.string(),
    entries: z.array(entryResponseSchema),
    pagination: z.object({
        page: z.number().int(),
        limit: z.number().int(),
        total: z.number().int(),
        totalPages: z.number().int(),
    }),
});

export const singleEntryResponseSchema = z.object({
    message: z.string(),
    entry: entryResponseSchema,
    settlements: z.array(settlementResponseSchema).optional(),
    warnings: z.array(z.string()).optional(),
});

export const createdEntriesResponseSchema = z.object({
    message: z.string(),
    entries: z.array(entryResponseSchema),
    warnings: z.array(z.string()).optional(),
});

export const settlementMutationResponseSchema = z.object({
    message: z.string(),
    entry: entryResponseSchema,
    settlement: settlementResponseSchema,
    accountCurrentBalanceCents: z.number().int(),
});

// ---------------- Reports & Export ----------------
export const cashflowQuerySchema = z.object({
    from: isoDateSchema,
    to: isoDateSchema,
    excludeIntercompany: z
        .enum(["true", "false"])
        .transform((v) => v === "true")
        .optional(),
});

export const cashflowResponseSchema = z.object({
    message: z.string(),
    period: z.object({
        from: z.string(),
        to: z.string(),
    }),
    summary: z.object({
        currentAccountsBalanceCents: z.number().int(),
        realizedInflowCents: z.number().int(),
        realizedOutflowCents: z.number().int(),
        realizedNetCents: z.number().int(),
        projectedInflowCents: z.number().int(),
        projectedOutflowCents: z.number().int(),
        projectedNetCents: z.number().int(),
        overdueReceivablePriorCents: z.number().int(),
        overduePayablePriorCents: z.number().int(),
    }),
    series: z.array(
        z.object({
            date: z.string(),
            realizedInflowCents: z.number().int(),
            realizedOutflowCents: z.number().int(),
            projectedInflowCents: z.number().int(),
            projectedOutflowCents: z.number().int(),
            netCents: z.number().int(),
        }),
    ),
});

export const agingQuerySchema = z.object({
    referenceDate: isoDateSchema.optional(),
    excludeIntercompany: z
        .enum(["true", "false"])
        .transform((v) => v === "true")
        .optional(),
});

const agingBucketSchema = z.object({
    upcomingCents: z.number().int(),
    overdue1to15Cents: z.number().int(),
    overdue16to30Cents: z.number().int(),
    overdue31to60Cents: z.number().int(),
    overdue61PlusCents: z.number().int(),
    totalOpenCents: z.number().int(),
    totalOverdueCents: z.number().int(),
    delinquencyRateBps: z.number().int(),
    openCount: z.number().int(),
    overdueCount: z.number().int(),
});

export const agingResponseSchema = z.object({
    message: z.string(),
    referenceDate: z.string(),
    receivable: agingBucketSchema,
    payable: agingBucketSchema,
});

export const exportReportQuerySchema = z.object({
    from: isoDateSchema.optional(),
    to: isoDateSchema.optional(),
    entryType: entryTypeEnum.optional(),
    excludeIntercompany: z
        .enum(["true", "false"])
        .transform((v) => v === "true")
        .optional(),
});

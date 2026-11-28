import { db } from "@/database/index";
import {
    clients,
    companies,
    costCenters,
    financialAccounts,
    financialCategories,
    financialEntries,
    financialIdempotencyKeys,
    financialSettlements,
    nf,
    services,
} from "@/database/schema/schema";
import { ensureDefaultFinancialCategories } from "@/lib/finance/defaultCategories";
import { hashIdempotencyPayload } from "@/lib/finance/idempotency";
import {
    calculateEntryNetCents,
    calculateSettlementTotals,
    centsToSafeNumber,
    computeEntryStatusAfterSettlement,
    intToCents,
    splitAmountIntoInstallments,
    type EntryStatus,
    type EntryType,
} from "@/lib/finance/money";
import {
    and,
    asc,
    desc,
    eq,
    gte,
    ilike,
    inArray,
    lte,
    or,
    sql,
} from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";

export class FinanceDomainError extends Error {
    public readonly statusCode: number;
    public readonly code: string;

    constructor(statusCode: number, code: string, message: string) {
        super(message);
        this.name = "FinanceDomainError";
        this.statusCode = statusCode;
        this.code = code;
    }
}

const MONETARY_ERROR_MESSAGES: Record<string, string> = {
    INVALID_MONETARY_AMOUNT: "Valor monetário inválido.",
    INVALID_CENTS_INTEGER: "Valor em centavos deve ser inteiro.",
    NET_AMOUNT_MUST_BE_POSITIVE:
        "O valor líquido do título deve ser maior que zero após descontos.",
    INVALID_INSTALLMENTS: "Quantidade de parcelas inválida.",
    INSTALLMENT_AMOUNT_TOO_SMALL:
        "O valor líquido é muito baixo para ser dividido nesta quantidade de parcelas.",
    MONETARY_OVERFLOW: "Valor monetário excede o limite suportado.",
};

function runMonetaryCalculation<T>(fn: () => T): T {
    try {
        return fn();
    } catch (err) {
        const code = err instanceof Error ? err.message : "";
        const friendly = MONETARY_ERROR_MESSAGES[code];
        if (friendly) {
            throw new FinanceDomainError(400, code, friendly);
        }
        throw err;
    }
}

function getPgUniqueViolationConstraint(err: unknown): string | null {
    if (!err || typeof err !== "object") {
        return null;
    }
    const record = err as {
        code?: unknown;
        constraint_name?: unknown;
        constraint?: unknown;
        cause?: {
            code?: unknown;
            constraint_name?: unknown;
            constraint?: unknown;
        };
    };
    if (record.code === "23505") {
        return String(
            record.constraint_name ?? record.constraint ?? "unique_violation",
        );
    }
    if (record.cause?.code === "23505") {
        return String(
            record.cause.constraint_name ??
                record.cause.constraint ??
                "unique_violation",
        );
    }
    return null;
}

export function todayIsoUtc(): string {
    return new Date().toISOString().slice(0, 10);
}

/**
 * Soma N meses a uma data YYYY-MM-DD preservando o último dia do mês quando necessário
 * (ex.: 2026-01-31 + 1 mês = 2026-02-28).
 */
export function addMonthsIsoDate(isoDate: string, monthsToAdd: number): string {
    if (monthsToAdd === 0) return isoDate;
    const [yearStr, monthStr, dayStr] = isoDate.split("-");
    const year = Number(yearStr);
    const monthIndex = Number(monthStr) - 1;
    const day = Number(dayStr);

    const targetTotalMonths = year * 12 + monthIndex + monthsToAdd;
    const targetYear = Math.floor(targetTotalMonths / 12);
    const targetMonthIndex = ((targetTotalMonths % 12) + 12) % 12;
    const lastDayOfTargetMonth = new Date(
        Date.UTC(targetYear, targetMonthIndex + 1, 0),
    ).getUTCDate();
    const clampedDay = Math.min(day, lastDayOfTargetMonth);

    return `${String(targetYear).padStart(4, "0")}-${String(targetMonthIndex + 1).padStart(2, "0")}-${String(clampedDay).padStart(2, "0")}`;
}

/**
 * Soma N meses à data-base preservando ano/mês e fixando o dia do mês (1..31),
 * ajustando automaticamente para o último dia do mês em meses mais curtos.
 */
export function addMonthsIsoDateWithFixedDay(
    baseIsoDate: string,
    monthsToAdd: number,
    fixedDay: number,
): string {
    const [yearStr, monthStr] = baseIsoDate.split("-");
    const year = Number(yearStr);
    const monthIndex = Number(monthStr) - 1;

    const targetTotalMonths = year * 12 + monthIndex + monthsToAdd;
    const targetYear = Math.floor(targetTotalMonths / 12);
    const targetMonthIndex = ((targetTotalMonths % 12) + 12) % 12;
    const lastDayOfTargetMonth = new Date(
        Date.UTC(targetYear, targetMonthIndex + 1, 0),
    ).getUTCDate();
    const clampedDay = Math.min(Math.max(1, fixedDay), lastDayOfTargetMonth);

    return `${String(targetYear).padStart(4, "0")}-${String(targetMonthIndex + 1).padStart(2, "0")}-${String(clampedDay).padStart(2, "0")}`;
}

export function diffDaysIso(laterIso: string, earlierIso: string): number {
    const laterMs = Date.parse(`${laterIso}T00:00:00Z`);
    const earlierMs = Date.parse(`${earlierIso}T00:00:00Z`);
    if (Number.isNaN(laterMs) || Number.isNaN(earlierMs)) {
        throw new FinanceDomainError(400, "INVALID_DATE", "Data inválida.");
    }
    return Math.floor((laterMs - earlierMs) / 86_400_000);
}

function serializeAccount(row: typeof financialAccounts.$inferSelect) {
    return {
        id: row.id,
        companyId: row.companyId,
        name: row.name,
        type: row.type as "checking" | "savings" | "cash" | "gateway" | "credit_card",
        bankCode: row.bankCode ?? null,
        agencyMasked: row.agencyMasked ?? null,
        accountMasked: row.accountMasked ?? null,
        initialBalanceCents: centsToSafeNumber(row.initialBalanceCents),
        initialBalanceDate: row.initialBalanceDate,
        currentBalanceCents: centsToSafeNumber(row.currentBalanceCents),
        active: row.active,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}

function serializeEntry(
    row: typeof financialEntries.$inferSelect,
    extra?: {
        categoryCode?: string | null;
        categoryName?: string | null;
        costCenterName?: string | null;
    },
) {
    const remaining = row.netAmountCents - row.settledAmountCents;
    return {
        id: row.id,
        companyId: row.companyId,
        entryType: row.entryType as EntryType,
        status: row.status as EntryStatus,
        description: row.description,
        documentNumber: row.documentNumber ?? null,
        notes: row.notes ?? null,
        clientId: row.clientId ?? null,
        counterpartyName: row.counterpartyName ?? null,
        counterpartyDocument: row.counterpartyDocument ?? null,
        serviceId: row.serviceId ?? null,
        nfId: row.nfId ?? null,
        categoryId: row.categoryId,
        categoryCode: extra?.categoryCode ?? null,
        categoryName: extra?.categoryName ?? null,
        costCenterId: row.costCenterId ?? null,
        costCenterName: extra?.costCenterName ?? null,
        competenceDate: row.competenceDate,
        issueDate: row.issueDate,
        dueDate: row.dueDate,
        paidAt: row.paidAt ? row.paidAt.toISOString() : null,
        originalAmountCents: centsToSafeNumber(row.originalAmountCents),
        discountCents: centsToSafeNumber(row.discountCents),
        interestCents: centsToSafeNumber(row.interestCents),
        fineCents: centsToSafeNumber(row.fineCents),
        netAmountCents: centsToSafeNumber(row.netAmountCents),
        settledAmountCents: centsToSafeNumber(row.settledAmountCents),
        remainingAmountCents: centsToSafeNumber(remaining > 0n ? remaining : 0n),
        installmentNumber: row.installmentNumber,
        totalInstallments: row.totalInstallments,
        installmentGroupId: row.installmentGroupId ?? null,
        isIntercompany: row.isIntercompany,
        counterpartyCompanyId: row.counterpartyCompanyId ?? null,
        createdBy: row.createdBy,
        cancelledBy: row.cancelledBy ?? null,
        cancelledAt: row.cancelledAt ? row.cancelledAt.toISOString() : null,
        cancelReason: row.cancelReason ?? null,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
    };
}

function serializeSettlement(
    row: typeof financialSettlements.$inferSelect,
    accountName?: string | null,
) {
    return {
        id: row.id,
        companyId: row.companyId,
        entryId: row.entryId,
        accountId: row.accountId,
        accountName: accountName ?? null,
        settlementType: row.settlementType as "payment" | "reversal",
        reversedSettlementId: row.reversedSettlementId ?? null,
        paymentMethod: row.paymentMethod as
            | "pix"
            | "boleto"
            | "bank_transfer"
            | "credit_card"
            | "debit_card"
            | "cash"
            | "other",
        settledAt: row.settledAt.toISOString(),
        principalCents: centsToSafeNumber(row.principalCents),
        interestCents: centsToSafeNumber(row.interestCents),
        fineCents: centsToSafeNumber(row.fineCents),
        discountCents: centsToSafeNumber(row.discountCents),
        gatewayFeeCents: centsToSafeNumber(row.gatewayFeeCents),
        totalSettledCents: centsToSafeNumber(row.totalSettledCents),
        notes: row.notes ?? null,
        createdBy: row.createdBy,
        createdAt: row.createdAt.toISOString(),
    };
}

export class FinanceRepository {
    // -------------------- Accounts --------------------
    async listAccounts(companyIds: string[]) {
        const rows = await db
            .select()
            .from(financialAccounts)
            .where(inArray(financialAccounts.companyId, companyIds))
            .orderBy(asc(financialAccounts.name));

        let totalCents = 0n;
        for (const r of rows) {
            if (r.active) {
                totalCents += r.currentBalanceCents;
            }
        }

        return {
            accounts: rows.map(serializeAccount),
            totalBalanceCents: centsToSafeNumber(totalCents),
        };
    }

    async createAccount(input: {
        companyId: string;
        name: string;
        type: string;
        bankCode?: string | null;
        agencyMasked?: string | null;
        accountMasked?: string | null;
        initialBalanceCents: number;
        initialBalanceDate: string;
    }) {
        const initialCents = intToCents(input.initialBalanceCents, {
            allowNegative: true,
        });
        const [created] = await db
            .insert(financialAccounts)
            .values({
                companyId: input.companyId,
                name: input.name,
                type: input.type,
                bankCode: input.bankCode ?? null,
                agencyMasked: input.agencyMasked ?? null,
                accountMasked: input.accountMasked ?? null,
                initialBalanceCents: initialCents,
                initialBalanceDate: input.initialBalanceDate,
                currentBalanceCents: initialCents,
                active: true,
            })
            .returning();

        return serializeAccount(created);
    }

    async updateAccount(
        id: string,
        companyIds: string[],
        input: {
            name?: string;
            bankCode?: string | null;
            agencyMasked?: string | null;
            accountMasked?: string | null;
            active?: boolean;
        },
    ) {
        const [existing] = await db
            .select()
            .from(financialAccounts)
            .where(
                and(
                    eq(financialAccounts.id, id),
                    inArray(financialAccounts.companyId, companyIds),
                ),
            )
            .limit(1);

        if (!existing) {
            throw new FinanceDomainError(
                404,
                "ACCOUNT_NOT_FOUND",
                "Conta financeira não encontrada.",
            );
        }

        const [updated] = await db
            .update(financialAccounts)
            .set({
                ...(input.name !== undefined ? { name: input.name } : {}),
                ...(input.bankCode !== undefined ? { bankCode: input.bankCode } : {}),
                ...(input.agencyMasked !== undefined
                    ? { agencyMasked: input.agencyMasked }
                    : {}),
                ...(input.accountMasked !== undefined
                    ? { accountMasked: input.accountMasked }
                    : {}),
                ...(input.active !== undefined ? { active: input.active } : {}),
            })
            .where(
                and(
                    eq(financialAccounts.id, id),
                    eq(financialAccounts.companyId, existing.companyId),
                ),
            )
            .returning();

        return serializeAccount(updated);
    }

    // -------------------- Categories --------------------
    async listCategories(
        activeCompanyId: string,
        companyIds: string[],
        accountType: "business" | "personal" = "business",
    ) {
        await ensureDefaultFinancialCategories(activeCompanyId, db, accountType);

        const rows = await db
            .select()
            .from(financialCategories)
            .where(inArray(financialCategories.companyId, companyIds))
            .orderBy(asc(financialCategories.code));

        return rows.map((row) => ({
            ...row,
            kind: row.kind as
                | "revenue"
                | "deduction"
                | "direct_cost"
                | "operating_expense"
                | "financial_result"
                | "transfer",
            dreGroup: (row.dreGroup ?? null) as
                | "gross_revenue"
                | "taxes_and_deductions"
                | "cogs"
                | "sales_marketing"
                | "ga_admin"
                | "payroll"
                | "financial_income"
                | "financial_expense"
                | "non_operational"
                | null,
        }));
    }

    private resolveAutoCategoryCodeConfig(
        kind: string,
        accountType: "business" | "personal",
    ): { prefix: string; startSeq: number; minBand: number; maxBand: number } {
        switch (kind) {
            case "revenue":
                return { prefix: "1", startSeq: 1, minBand: 1, maxBand: 89 };
            case "deduction":
                return { prefix: "1", startSeq: 90, minBand: 90, maxBand: 999 };
            case "direct_cost":
                return { prefix: "2", startSeq: 1, minBand: 1, maxBand: 89 };
            case "operating_expense":
                return accountType === "personal"
                    ? { prefix: "2", startSeq: 1, minBand: 1, maxBand: 89 }
                    : { prefix: "3", startSeq: 1, minBand: 1, maxBand: 89 };
            case "financial_result":
                return { prefix: "4", startSeq: 1, minBand: 1, maxBand: 89 };
            case "transfer":
                return { prefix: "5", startSeq: 90, minBand: 90, maxBand: 999 };
            default:
                return { prefix: "3", startSeq: 1, minBand: 1, maxBand: 89 };
        }
    }

    async createCategory(input: {
        companyId: string;
        accountType?: "business" | "personal";
        allowManualFinanceCodes?: boolean;
        parentId?: string | null;
        code?: string;
        name: string;
        kind: string;
        dreGroup?: string | null;
    }) {
        const accountType = input.accountType ?? "business";
        await ensureDefaultFinancialCategories(input.companyId, db, accountType);

        const trimmedManualCode = input.code?.trim();
        if (trimmedManualCode && !input.allowManualFinanceCodes) {
            throw new FinanceDomainError(
                403,
                "MANUAL_CODE_NOT_ENABLED",
                "Código manual desabilitado para esta conta. Habilite a opção nas configurações administrativas para informar códigos manualmente.",
            );
        }

        if (input.parentId) {
            const [parent] = await db
                .select({ id: financialCategories.id })
                .from(financialCategories)
                .where(
                    and(
                        eq(financialCategories.id, input.parentId),
                        eq(financialCategories.companyId, input.companyId),
                    ),
                )
                .limit(1);
            if (!parent) {
                throw new FinanceDomainError(
                    404,
                    "PARENT_CATEGORY_NOT_FOUND",
                    "Categoria pai não encontrada nesta empresa.",
                );
            }
        }

        if (trimmedManualCode) {
            const [duplicate] = await db
                .select({ id: financialCategories.id })
                .from(financialCategories)
                .where(
                    and(
                        eq(financialCategories.companyId, input.companyId),
                        eq(financialCategories.code, trimmedManualCode),
                    ),
                )
                .limit(1);

            if (duplicate) {
                throw new FinanceDomainError(
                    409,
                    "CATEGORY_CODE_CONFLICT",
                    "Já existe uma categoria financeira com este código.",
                );
            }

            try {
                const [created] = await db
                    .insert(financialCategories)
                    .values({
                        companyId: input.companyId,
                        parentId: input.parentId ?? null,
                        code: trimmedManualCode,
                        name: input.name,
                        kind: input.kind,
                        dreGroup: input.dreGroup ?? null,
                        isSystem: false,
                        active: true,
                    })
                    .returning();

                return created;
            } catch (err) {
                if (getPgUniqueViolationConstraint(err)) {
                    throw new FinanceDomainError(
                        409,
                        "CATEGORY_CODE_CONFLICT",
                        "Já existe uma categoria financeira com este código.",
                    );
                }
                throw err;
            }
        }

        const existingRows = await db
            .select({ code: financialCategories.code })
            .from(financialCategories)
            .where(eq(financialCategories.companyId, input.companyId));
        const existingSet = new Set(existingRows.map((r) => r.code));
        const { prefix, startSeq, minBand, maxBand } =
            this.resolveAutoCategoryCodeConfig(input.kind, accountType);

        const codeRegex = new RegExp(`^${prefix}\\.(\\d+)$`);
        let maxSeq = startSeq - 1;
        for (const existingCode of existingSet) {
            const match = codeRegex.exec(existingCode);
            if (!match) continue;
            const n = Number.parseInt(match[1], 10);
            if (Number.isInteger(n) && n >= minBand && n <= maxBand && n > maxSeq) {
                maxSeq = n;
            }
        }

        let nextSeq = maxSeq + 1;
        for (let attempt = 0; attempt < 5; attempt++) {
            if (nextSeq > maxBand) {
                throw new FinanceDomainError(
                    409,
                    "CATEGORY_CODE_BAND_EXHAUSTED",
                    "Limite de códigos automáticos atingido para esta classificação. Habilite códigos manuais nas configurações para continuar.",
                );
            }
            let candidate = `${prefix}.${String(nextSeq).padStart(2, "0")}`;
            while (existingSet.has(candidate)) {
                nextSeq += 1;
                if (nextSeq > maxBand) {
                    throw new FinanceDomainError(
                        409,
                        "CATEGORY_CODE_BAND_EXHAUSTED",
                        "Limite de códigos automáticos atingido para esta classificação. Habilite códigos manuais nas configurações para continuar.",
                    );
                }
                candidate = `${prefix}.${String(nextSeq).padStart(2, "0")}`;
            }
            existingSet.add(candidate);

            try {
                const [created] = await db
                    .insert(financialCategories)
                    .values({
                        companyId: input.companyId,
                        parentId: input.parentId ?? null,
                        code: candidate,
                        name: input.name,
                        kind: input.kind,
                        dreGroup: input.dreGroup ?? null,
                        isSystem: false,
                        active: true,
                    })
                    .returning();

                return created;
            } catch (err) {
                if (getPgUniqueViolationConstraint(err) && attempt < 4) {
                    nextSeq += 1;
                    continue;
                }
                if (getPgUniqueViolationConstraint(err)) {
                    throw new FinanceDomainError(
                        409,
                        "CATEGORY_CODE_CONFLICT",
                        "Não foi possível gerar código único para a categoria. Tente novamente.",
                    );
                }
                throw err;
            }
        }

        throw new FinanceDomainError(
            500,
            "CATEGORY_CODE_GENERATION_FAILED",
            "Não foi possível gerar código automático para a categoria financeira.",
        );
    }

    async updateCategory(
        id: string,
        companyIds: string[],
        input: {
            parentId?: string | null;
            name?: string;
            kind?: string;
            dreGroup?: string | null;
            active?: boolean;
        },
    ) {
        const [existing] = await db
            .select()
            .from(financialCategories)
            .where(
                and(
                    eq(financialCategories.id, id),
                    inArray(financialCategories.companyId, companyIds),
                ),
            )
            .limit(1);

        if (!existing) {
            throw new FinanceDomainError(
                404,
                "CATEGORY_NOT_FOUND",
                "Categoria financeira não encontrada.",
            );
        }

        if (
            existing.isSystem &&
            (input.active === false ||
                (input.kind !== undefined && input.kind !== existing.kind) ||
                (input.dreGroup !== undefined &&
                    input.dreGroup !== existing.dreGroup) ||
                (input.parentId !== undefined &&
                    input.parentId !== existing.parentId))
        ) {
            throw new FinanceDomainError(
                409,
                "SYSTEM_CATEGORY_PROTECTED",
                "Categorias padrão do sistema não permitem alterar classificação, hierarquia ou desativação.",
            );
        }

        if (input.parentId !== undefined && input.parentId !== null) {
            if (input.parentId === id) {
                throw new FinanceDomainError(
                    400,
                    "INVALID_PARENT_CATEGORY",
                    "Categoria não pode ser pai de si mesma.",
                );
            }
            const companyCategories = await db
                .select({
                    id: financialCategories.id,
                    parentId: financialCategories.parentId,
                })
                .from(financialCategories)
                .where(eq(financialCategories.companyId, existing.companyId));

            const parentMap = new Map(
                companyCategories.map((c) => [c.id, c.parentId]),
            );
            if (!parentMap.has(input.parentId)) {
                throw new FinanceDomainError(
                    404,
                    "PARENT_CATEGORY_NOT_FOUND",
                    "Categoria pai não encontrada nesta empresa.",
                );
            }

            const visited = new Set<string>();
            let cursor: string | null = input.parentId;
            while (cursor) {
                if (cursor === id || visited.has(cursor)) {
                    throw new FinanceDomainError(
                        400,
                        "CATEGORY_CYCLE_DETECTED",
                        "A hierarquia de categorias não pode formar ciclos.",
                    );
                }
                visited.add(cursor);
                cursor = parentMap.get(cursor) ?? null;
            }
        }

        const [updated] = await db
            .update(financialCategories)
            .set({
                ...(input.parentId !== undefined ? { parentId: input.parentId } : {}),
                ...(input.name !== undefined ? { name: input.name } : {}),
                ...(input.kind !== undefined ? { kind: input.kind } : {}),
                ...(input.dreGroup !== undefined ? { dreGroup: input.dreGroup } : {}),
                ...(input.active !== undefined ? { active: input.active } : {}),
            })
            .where(
                and(
                    eq(financialCategories.id, id),
                    eq(financialCategories.companyId, existing.companyId),
                ),
            )
            .returning();

        return updated;
    }

    // -------------------- Cost Centers --------------------
    async listCostCenters(companyIds: string[]) {
        return db
            .select()
            .from(costCenters)
            .where(inArray(costCenters.companyId, companyIds))
            .orderBy(asc(costCenters.code));
    }

    async createCostCenter(input: {
        companyId: string;
        allowManualFinanceCodes?: boolean;
        code?: string;
        name: string;
    }) {
        const trimmedManualCode = input.code?.trim();
        if (trimmedManualCode && !input.allowManualFinanceCodes) {
            throw new FinanceDomainError(
                403,
                "MANUAL_CODE_NOT_ENABLED",
                "Código manual desabilitado para esta conta. Habilite a opção nas configurações administrativas para informar códigos manualmente.",
            );
        }

        if (trimmedManualCode) {
            const [duplicate] = await db
                .select({ id: costCenters.id })
                .from(costCenters)
                .where(
                    and(
                        eq(costCenters.companyId, input.companyId),
                        eq(costCenters.code, trimmedManualCode),
                    ),
                )
                .limit(1);

            if (duplicate) {
                throw new FinanceDomainError(
                    409,
                    "COST_CENTER_CODE_CONFLICT",
                    "Já existe um centro de custo com este código.",
                );
            }

            try {
                const [created] = await db
                    .insert(costCenters)
                    .values({
                        companyId: input.companyId,
                        code: trimmedManualCode,
                        name: input.name,
                        active: true,
                    })
                    .returning();

                return created;
            } catch (err) {
                if (getPgUniqueViolationConstraint(err)) {
                    throw new FinanceDomainError(
                        409,
                        "COST_CENTER_CODE_CONFLICT",
                        "Já existe um centro de custo com este código.",
                    );
                }
                throw err;
            }
        }

        const existingRows = await db
            .select({ code: costCenters.code })
            .from(costCenters)
            .where(eq(costCenters.companyId, input.companyId));
        const existingSet = new Set(existingRows.map((r) => r.code.toUpperCase()));
        let maxNum = 0;
        for (const existingCode of existingRows) {
            const match = /^CC-(\d+)$/i.exec(existingCode.code.trim());
            if (!match) continue;
            const n = Number.parseInt(match[1], 10);
            if (Number.isInteger(n) && n > maxNum) {
                maxNum = n;
            }
        }

        let nextNum = maxNum + 1;
        for (let attempt = 0; attempt < 5; attempt++) {
            let candidate = `CC-${String(nextNum).padStart(2, "0")}`;
            while (existingSet.has(candidate)) {
                nextNum += 1;
                candidate = `CC-${String(nextNum).padStart(2, "0")}`;
            }
            existingSet.add(candidate);

            try {
                const [created] = await db
                    .insert(costCenters)
                    .values({
                        companyId: input.companyId,
                        code: candidate,
                        name: input.name,
                        active: true,
                    })
                    .returning();

                return created;
            } catch (err) {
                if (getPgUniqueViolationConstraint(err) && attempt < 4) {
                    nextNum += 1;
                    continue;
                }
                if (getPgUniqueViolationConstraint(err)) {
                    throw new FinanceDomainError(
                        409,
                        "COST_CENTER_CODE_CONFLICT",
                        "Não foi possível gerar código único para o centro de custo. Tente novamente.",
                    );
                }
                throw err;
            }
        }

        throw new FinanceDomainError(
            500,
            "COST_CENTER_CODE_GENERATION_FAILED",
            "Não foi possível gerar código automático para o centro de custo.",
        );
    }

    async updateCostCenter(
        id: string,
        companyIds: string[],
        input: { name?: string; active?: boolean },
    ) {
        const [existing] = await db
            .select()
            .from(costCenters)
            .where(
                and(
                    eq(costCenters.id, id),
                    inArray(costCenters.companyId, companyIds),
                ),
            )
            .limit(1);

        if (!existing) {
            throw new FinanceDomainError(
                404,
                "COST_CENTER_NOT_FOUND",
                "Centro de custo não encontrado.",
            );
        }

        const [updated] = await db
            .update(costCenters)
            .set({
                ...(input.name !== undefined ? { name: input.name } : {}),
                ...(input.active !== undefined ? { active: input.active } : {}),
            })
            .where(
                and(
                    eq(costCenters.id, id),
                    eq(costCenters.companyId, existing.companyId),
                ),
            )
            .returning();

        return updated;
    }

    // -------------------- Counterparties --------------------
    async listCounterparties(
        companyIds: string[],
        filters: { search?: string; limit: number },
    ) {
        const conditions = [
            inArray(clients.companyId, companyIds),
            eq(clients.active, true),
            sql`${clients.anonymizedAt} IS NULL`,
        ];

        if (filters.search) {
            const pattern = `%${filters.search}%`;
            const searchCondition = or(
                ilike(clients.tradeName, pattern),
                ilike(clients.registeredCompanyName, pattern),
                ilike(clients.cnpj, pattern),
                ilike(clients.cpf, pattern),
            );
            if (searchCondition) {
                conditions.push(searchCondition);
            }
        }

        const rows = await db
            .select({
                id: clients.id,
                companyId: clients.companyId,
                tradeName: clients.tradeName,
                registeredCompanyName: clients.registeredCompanyName,
                cnpj: clients.cnpj,
                cpf: clients.cpf,
            })
            .from(clients)
            .where(and(...conditions))
            .orderBy(asc(clients.tradeName))
            .limit(filters.limit);

        return rows.map((row) => ({
            id: row.id,
            companyId: row.companyId ?? null,
            tradeName: row.tradeName,
            registeredCompanyName: row.registeredCompanyName,
            document: row.cnpj
                ? row.cnpj
                : row.cpf && row.cpf.length >= 4
                  ? `***.***.***-${row.cpf.slice(-2)}`
                  : null,
        }));
    }

    // -------------------- Entries --------------------
    async listEntries(
        companyIds: string[],
        filters: {
            page: number;
            limit: number;
            entryType?: EntryType;
            status?: EntryStatus;
            categoryId?: string;
            costCenterId?: string;
            clientId?: string;
            serviceId?: string;
            nfId?: string;
            dueFrom?: string;
            dueTo?: string;
            competenceFrom?: string;
            competenceTo?: string;
            excludeIntercompany?: boolean;
            search?: string;
        },
    ) {
        const conditions = [inArray(financialEntries.companyId, companyIds)];

        if (filters.entryType) {
            conditions.push(eq(financialEntries.entryType, filters.entryType));
        }
        if (filters.status) {
            conditions.push(eq(financialEntries.status, filters.status));
        }
        if (filters.categoryId) {
            conditions.push(eq(financialEntries.categoryId, filters.categoryId));
        }
        if (filters.costCenterId) {
            conditions.push(eq(financialEntries.costCenterId, filters.costCenterId));
        }
        if (filters.clientId) {
            conditions.push(eq(financialEntries.clientId, filters.clientId));
        }
        if (filters.serviceId) {
            conditions.push(eq(financialEntries.serviceId, filters.serviceId));
        }
        if (filters.nfId) {
            conditions.push(eq(financialEntries.nfId, filters.nfId));
        }
        if (filters.dueFrom) {
            conditions.push(gte(financialEntries.dueDate, filters.dueFrom));
        }
        if (filters.dueTo) {
            conditions.push(lte(financialEntries.dueDate, filters.dueTo));
        }
        if (filters.competenceFrom) {
            conditions.push(
                gte(financialEntries.competenceDate, filters.competenceFrom),
            );
        }
        if (filters.competenceTo) {
            conditions.push(
                lte(financialEntries.competenceDate, filters.competenceTo),
            );
        }
        if (filters.excludeIntercompany) {
            conditions.push(eq(financialEntries.isIntercompany, false));
        }
        if (filters.search) {
            const pattern = `%${filters.search}%`;
            const searchCondition = or(
                ilike(financialEntries.description, pattern),
                ilike(financialEntries.documentNumber, pattern),
                ilike(financialEntries.counterpartyName, pattern),
            );
            if (searchCondition) {
                conditions.push(searchCondition);
            }
        }

        const whereClause = and(...conditions);

        const [{ count }] = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(financialEntries)
            .where(whereClause);

        const offset = (filters.page - 1) * filters.limit;

        const rows = await db
            .select({
                entry: financialEntries,
                categoryCode: financialCategories.code,
                categoryName: financialCategories.name,
                costCenterName: costCenters.name,
            })
            .from(financialEntries)
            .leftJoin(
                financialCategories,
                eq(financialEntries.categoryId, financialCategories.id),
            )
            .leftJoin(
                costCenters,
                eq(financialEntries.costCenterId, costCenters.id),
            )
            .where(whereClause)
            .orderBy(asc(financialEntries.dueDate), desc(financialEntries.createdAt))
            .limit(filters.limit)
            .offset(offset);

        return {
            entries: rows.map((r) =>
                serializeEntry(r.entry, {
                    categoryCode: r.categoryCode,
                    categoryName: r.categoryName,
                    costCenterName: r.costCenterName,
                }),
            ),
            pagination: {
                page: filters.page,
                limit: filters.limit,
                total: count,
                totalPages: Math.max(1, Math.ceil(count / filters.limit)),
            },
        };
    }

    async getEntryById(id: string, companyIds: string[]) {
        const [row] = await db
            .select({
                entry: financialEntries,
                categoryCode: financialCategories.code,
                categoryName: financialCategories.name,
                costCenterName: costCenters.name,
            })
            .from(financialEntries)
            .leftJoin(
                financialCategories,
                eq(financialEntries.categoryId, financialCategories.id),
            )
            .leftJoin(
                costCenters,
                eq(financialEntries.costCenterId, costCenters.id),
            )
            .where(
                and(
                    eq(financialEntries.id, id),
                    inArray(financialEntries.companyId, companyIds),
                ),
            )
            .limit(1);

        if (!row) {
            throw new FinanceDomainError(
                404,
                "ENTRY_NOT_FOUND",
                "Título financeiro não encontrado.",
            );
        }

        const settlementRows = await db
            .select({
                settlement: financialSettlements,
                accountName: financialAccounts.name,
            })
            .from(financialSettlements)
            .leftJoin(
                financialAccounts,
                eq(financialSettlements.accountId, financialAccounts.id),
            )
            .where(
                and(
                    eq(financialSettlements.entryId, id),
                    eq(financialSettlements.companyId, row.entry.companyId),
                ),
            )
            .orderBy(asc(financialSettlements.settledAt), asc(financialSettlements.createdAt));

        return {
            entry: serializeEntry(row.entry, {
                categoryCode: row.categoryCode,
                categoryName: row.categoryName,
                costCenterName: row.costCenterName,
            }),
            settlements: settlementRows.map((s) =>
                serializeSettlement(s.settlement, s.accountName),
            ),
        };
    }

    async createEntries(input: {
        companyId: string;
        motherId: string;
        accountType?: "business" | "personal";
        userId: string;
        idempotencyKey: string;
        endpoint: string;
        rawPayloadForHash: unknown;
        entryType: EntryType;
        status: "draft" | "pending";
        description: string;
        documentNumber?: string | null;
        notes?: string | null;
        clientId?: string | null;
        counterpartyName?: string | null;
        serviceId?: string | null;
        nfId?: string | null;
        categoryId: string;
        costCenterId?: string | null;
        competenceDate: string;
        issueDate: string;
        dueDate: string;
        originalAmountCents: number;
        discountCents: number;
        interestCents: number;
        fineCents: number;
        totalInstallments: number;
        installmentDueDay?: number | null;
        isIntercompany: boolean;
        counterpartyCompanyId?: string | null;
    }) {
        const requestHash = hashIdempotencyPayload(input.rawPayloadForHash);

        try {
            return await db.transaction(async (tx) => {
            const [existingIdemp] = await tx
                .select()
                .from(financialIdempotencyKeys)
                .where(
                    and(
                        eq(financialIdempotencyKeys.companyId, input.companyId),
                        eq(financialIdempotencyKeys.endpoint, input.endpoint),
                        eq(financialIdempotencyKeys.idempotencyKey, input.idempotencyKey),
                    ),
                )
                .limit(1);

            if (existingIdemp) {
                if (existingIdemp.requestHash !== requestHash) {
                    throw new FinanceDomainError(
                        409,
                        "IDEMPOTENCY_KEY_CONFLICT",
                        "Idempotency-Key já utilizada com payload diferente.",
                    );
                }
                return {
                    replayed: true,
                    statusCode: existingIdemp.responseStatus,
                    payload: JSON.parse(existingIdemp.responseBody) as {
                        message: string;
                        entries: ReturnType<typeof serializeEntry>[];
                        warnings?: string[];
                    },
                };
            }

            const accountType = input.accountType ?? "business";

            if (accountType === "personal") {
                if (input.nfId) {
                    throw new FinanceDomainError(
                        403,
                        "NF_NOT_AVAILABLE_FOR_PERSONAL",
                        "Notas fiscais estão disponíveis apenas para contas empresariais (CNPJ).",
                    );
                }
                if (input.isIntercompany || input.counterpartyCompanyId) {
                    throw new FinanceDomainError(
                        400,
                        "INTERCOMPANY_NOT_ALLOWED_FOR_PERSONAL",
                        "Lançamentos intercompany estão disponíveis apenas para contas empresariais (CNPJ).",
                    );
                }
            } else if (!input.clientId) {
                throw new FinanceDomainError(
                    400,
                    "CLIENT_REQUIRED",
                    "Selecione um cliente ou fornecedor cadastrado.",
                );
            }

            await ensureDefaultFinancialCategories(input.companyId, tx, accountType);

            const [category] = await tx
                .select()
                .from(financialCategories)
                .where(
                    and(
                        eq(financialCategories.id, input.categoryId),
                        eq(financialCategories.companyId, input.companyId),
                        eq(financialCategories.active, true),
                    ),
                )
                .limit(1);
            if (!category) {
                throw new FinanceDomainError(
                    404,
                    "CATEGORY_NOT_FOUND",
                    "Categoria financeira inválida ou inativa para esta empresa.",
                );
            }

            if (input.costCenterId) {
                const [cc] = await tx
                    .select({ id: costCenters.id })
                    .from(costCenters)
                    .where(
                        and(
                            eq(costCenters.id, input.costCenterId),
                            eq(costCenters.companyId, input.companyId),
                            eq(costCenters.active, true),
                        ),
                    )
                    .limit(1);
                if (!cc) {
                    throw new FinanceDomainError(
                        404,
                        "COST_CENTER_NOT_FOUND",
                        "Centro de custo inválido ou inativo para esta empresa.",
                    );
                }
            }

            let resolvedClientId: string | null = null;
            let resolvedCounterpartyName: string;
            let resolvedCounterpartyDocument: string | null = null;

            if (input.clientId) {
                const [client] = await tx
                    .select({
                        id: clients.id,
                        tradeName: clients.tradeName,
                        registeredCompanyName: clients.registeredCompanyName,
                        cnpj: clients.cnpj,
                        cpf: clients.cpf,
                    })
                    .from(clients)
                    .where(
                        and(
                            eq(clients.id, input.clientId),
                            eq(clients.companyId, input.companyId),
                            eq(clients.active, true),
                            sql`${clients.anonymizedAt} IS NULL`,
                        ),
                    )
                    .limit(1);
                if (!client) {
                    throw new FinanceDomainError(
                        404,
                        "CLIENT_NOT_FOUND",
                        "Cliente/Fornecedor não encontrado ou inativo nesta empresa.",
                    );
                }
                resolvedClientId = client.id;
                resolvedCounterpartyName =
                    client.tradeName || client.registeredCompanyName;
                resolvedCounterpartyDocument = client.cnpj
                    ? client.cnpj
                    : client.cpf && client.cpf.length >= 4
                      ? `***.***.***-${client.cpf.slice(-2)}`
                      : null;
            } else {
                const customName = input.counterpartyName?.trim();
                resolvedCounterpartyName = customName || "Não informado";
            }

            if (input.serviceId) {
                const [service] = await tx
                    .select({ id: services.id, clientId: services.clientId })
                    .from(services)
                    .where(
                        and(
                            eq(services.id, input.serviceId),
                            eq(services.companyId, input.companyId),
                        ),
                    )
                    .limit(1);
                if (!service) {
                    throw new FinanceDomainError(
                        404,
                        "SERVICE_NOT_FOUND",
                        "Serviço não encontrado nesta empresa.",
                    );
                }
                if (service.clientId !== input.clientId) {
                    throw new FinanceDomainError(
                        409,
                        "SERVICE_CLIENT_MISMATCH",
                        "O serviço informado pertence a outro cliente.",
                    );
                }
            }

            const warnings: string[] = [];
            if (input.nfId) {
                const [note] = await tx
                    .select()
                    .from(nf)
                    .where(
                        and(
                            eq(nf.id, input.nfId),
                            eq(nf.companyId, input.companyId),
                        ),
                    )
                    .limit(1);
                if (!note || !note.active) {
                    throw new FinanceDomainError(
                        404,
                        "NF_NOT_FOUND",
                        "Nota fiscal não encontrada ou inativa nesta empresa.",
                    );
                }
                if (note.thirdPartyClientId !== input.clientId) {
                    throw new FinanceDomainError(
                        409,
                        "NF_CLIENT_MISMATCH",
                        "A nota fiscal informada pertence a outro cliente.",
                    );
                }
                if (input.serviceId && note.servicesId !== input.serviceId) {
                    throw new FinanceDomainError(
                        409,
                        "NF_SERVICE_MISMATCH",
                        "A nota fiscal informada pertence a outro serviço.",
                    );
                }
            }

            if (!input.isIntercompany && input.counterpartyCompanyId) {
                throw new FinanceDomainError(
                    400,
                    "COUNTERPARTY_REQUIRES_INTERCOMPANY",
                    "Empresa contraparte só pode ser informada em lançamentos intercompany.",
                );
            }

            if (input.counterpartyCompanyId) {
                if (input.counterpartyCompanyId === input.companyId) {
                    throw new FinanceDomainError(
                        400,
                        "INVALID_COUNTERPARTY_COMPANY",
                        "A empresa contraparte deve ser diferente da empresa ativa.",
                    );
                }
                const [cpCompany] = await tx
                    .select({ id: companies.id })
                    .from(companies)
                    .where(
                        and(
                            eq(companies.id, input.counterpartyCompanyId),
                            eq(companies.active, true),
                            or(
                                eq(companies.id, input.motherId),
                                eq(companies.motherId, input.motherId),
                            ),
                        ),
                    )
                    .limit(1);
                if (!cpCompany) {
                    throw new FinanceDomainError(
                        404,
                        "COUNTERPARTY_COMPANY_NOT_FOUND",
                        "Empresa contraparte não encontrada neste grupo empresarial.",
                    );
                }
            }

            const {
                originalCents,
                discountCents,
                interestCents,
                fineCents,
                totalNetCents,
            } = runMonetaryCalculation(() => {
                const orig = intToCents(input.originalAmountCents, {
                    positive: true,
                });
                const disc = intToCents(input.discountCents);
                const intr = intToCents(input.interestCents);
                const fine = intToCents(input.fineCents);
                const net = calculateEntryNetCents({
                    originalAmountCents: orig,
                    discountCents: disc,
                    interestCents: intr,
                    fineCents: fine,
                });
                return {
                    originalCents: orig,
                    discountCents: disc,
                    interestCents: intr,
                    fineCents: fine,
                    totalNetCents: net,
                };
            });

            const today = todayIsoUtc();
            const groupId = input.totalInstallments > 1 ? uuidv7() : null;

            const valuesToInsert: Array<typeof financialEntries.$inferInsert> = [];

            if (input.totalInstallments === 1) {
                const computedStatus =
                    input.status === "draft"
                        ? "draft"
                        : input.dueDate < today
                          ? "overdue"
                          : "pending";

                valuesToInsert.push({
                    companyId: input.companyId,
                    entryType: input.entryType,
                    status: computedStatus,
                    description: input.description,
                    documentNumber: input.documentNumber ?? null,
                    notes: input.notes ?? null,
                    clientId: resolvedClientId,
                    counterpartyName: resolvedCounterpartyName,
                    counterpartyDocument: resolvedCounterpartyDocument,
                    serviceId: input.serviceId ?? null,
                    nfId: input.nfId ?? null,
                    categoryId: input.categoryId,
                    costCenterId: input.costCenterId ?? null,
                    competenceDate: input.competenceDate,
                    issueDate: input.issueDate,
                    dueDate: input.dueDate,
                    originalAmountCents: originalCents,
                    discountCents,
                    interestCents,
                    fineCents,
                    netAmountCents: totalNetCents,
                    settledAmountCents: 0n,
                    installmentNumber: 1,
                    totalInstallments: 1,
                    installmentGroupId: null,
                    isIntercompany: input.isIntercompany,
                    counterpartyCompanyId: input.counterpartyCompanyId ?? null,
                    createdBy: input.userId,
                    idempotencyKey: input.idempotencyKey,
                });
            } else {
                if (
                    input.installmentDueDay === undefined ||
                    input.installmentDueDay === null ||
                    !Number.isInteger(input.installmentDueDay) ||
                    input.installmentDueDay < 1 ||
                    input.installmentDueDay > 31
                ) {
                    throw new FinanceDomainError(
                        400,
                        "INSTALLMENT_DUE_DAY_REQUIRED",
                        "Informe o dia do mês de vencimento (1 a 31) para lançamentos parcelados.",
                    );
                }
                const parts = runMonetaryCalculation(() =>
                    splitAmountIntoInstallments(
                        totalNetCents,
                        input.totalInstallments,
                    ),
                );
                for (let idx = 0; idx < parts.length; idx++) {
                    const partDueDate = addMonthsIsoDateWithFixedDay(
                        input.dueDate,
                        idx,
                        input.installmentDueDay,
                    );
                    const partCompDate = addMonthsIsoDate(input.competenceDate, idx);
                    const computedStatus =
                        input.status === "draft"
                            ? "draft"
                            : partDueDate < today
                              ? "overdue"
                              : "pending";
                    const partAmount = parts[idx];
                    valuesToInsert.push({
                        companyId: input.companyId,
                        entryType: input.entryType,
                        status: computedStatus,
                        description: `${input.description} (${idx + 1}/${input.totalInstallments})`,
                        documentNumber: input.documentNumber ?? null,
                        notes: input.notes ?? null,
                        clientId: resolvedClientId,
                        counterpartyName: resolvedCounterpartyName,
                        counterpartyDocument: resolvedCounterpartyDocument,
                        serviceId: input.serviceId ?? null,
                        nfId: input.nfId ?? null,
                        categoryId: input.categoryId,
                        costCenterId: input.costCenterId ?? null,
                        competenceDate: partCompDate,
                        issueDate: input.issueDate,
                        dueDate: partDueDate,
                        originalAmountCents: partAmount,
                        discountCents: 0n,
                        interestCents: 0n,
                        fineCents: 0n,
                        netAmountCents: partAmount,
                        settledAmountCents: 0n,
                        installmentNumber: idx + 1,
                        totalInstallments: input.totalInstallments,
                        installmentGroupId: groupId,
                        isIntercompany: input.isIntercompany,
                        counterpartyCompanyId: input.counterpartyCompanyId ?? null,
                        createdBy: input.userId,
                        idempotencyKey: input.idempotencyKey,
                    });
                }
            }

            const inserted = await tx
                .insert(financialEntries)
                .values(valuesToInsert)
                .returning();

            const serialized = inserted.map((row) =>
                serializeEntry(row, {
                    categoryCode: category.code,
                    categoryName: category.name,
                }),
            );

            const responsePayload = {
                message:
                    serialized.length > 1
                        ? "Parcelas financeiras criadas com sucesso"
                        : "Título financeiro criado com sucesso",
                entries: serialized,
                ...(warnings.length > 0 ? { warnings } : {}),
            };

            await tx.insert(financialIdempotencyKeys).values({
                companyId: input.companyId,
                endpoint: input.endpoint,
                idempotencyKey: input.idempotencyKey,
                requestHash,
                responseStatus: 201,
                responseBody: JSON.stringify(responsePayload),
                createdBy: input.userId,
            });

            return {
                replayed: false,
                statusCode: 201,
                payload: responsePayload,
            };
        });
        } catch (err) {
            if (getPgUniqueViolationConstraint(err)) {
                const [existingIdemp] = await db
                    .select()
                    .from(financialIdempotencyKeys)
                    .where(
                        and(
                            eq(financialIdempotencyKeys.companyId, input.companyId),
                            eq(financialIdempotencyKeys.endpoint, input.endpoint),
                            eq(
                                financialIdempotencyKeys.idempotencyKey,
                                input.idempotencyKey,
                            ),
                        ),
                    )
                    .limit(1);

                if (existingIdemp && existingIdemp.requestHash === requestHash) {
                    return {
                        replayed: true,
                        statusCode: existingIdemp.responseStatus,
                        payload: JSON.parse(existingIdemp.responseBody) as {
                            message: string;
                            entries: ReturnType<typeof serializeEntry>[];
                            warnings?: string[];
                        },
                    };
                }

                throw new FinanceDomainError(
                    409,
                    "IDEMPOTENCY_KEY_CONFLICT",
                    "Idempotency-Key já utilizada em outra operação ou com payload diferente.",
                );
            }
            throw err;
        }
    }

    async updateEntry(
        id: string,
        companyIds: string[],
        input: {
            status?: "draft" | "pending";
            description?: string;
            documentNumber?: string | null;
            notes?: string | null;
            clientId?: string;
            counterpartyName?: string | null;
            categoryId?: string;
            costCenterId?: string | null;
            competenceDate?: string;
            issueDate?: string;
            dueDate?: string;
            originalAmountCents?: number;
            discountCents?: number;
            interestCents?: number;
            fineCents?: number;
        },
        accountType: "business" | "personal" = "business",
    ) {
        return db.transaction(async (tx) => {
            const [existing] = await tx
                .select()
                .from(financialEntries)
                .where(
                    and(
                        eq(financialEntries.id, id),
                        inArray(financialEntries.companyId, companyIds),
                    ),
                )
                .for("update")
                .limit(1);

            if (!existing) {
                throw new FinanceDomainError(
                    404,
                    "ENTRY_NOT_FOUND",
                    "Título financeiro não encontrado.",
                );
            }

            if (existing.status === "paid" || existing.status === "cancelled") {
                throw new FinanceDomainError(
                    409,
                    "ENTRY_LOCKED",
                    "Títulos pagos ou cancelados não podem ser editados.",
                );
            }

            const hasMonetaryOrScheduleChange =
                input.originalAmountCents !== undefined ||
                input.discountCents !== undefined ||
                input.interestCents !== undefined ||
                input.fineCents !== undefined ||
                input.competenceDate !== undefined ||
                input.issueDate !== undefined ||
                input.dueDate !== undefined ||
                input.categoryId !== undefined ||
                input.clientId !== undefined ||
                input.counterpartyName !== undefined ||
                input.status !== undefined;

            if (existing.settledAmountCents > 0n && hasMonetaryOrScheduleChange) {
                throw new FinanceDomainError(
                    409,
                    "ENTRY_HAS_SETTLEMENTS",
                    "Título com baixas realizadas só permite editar descrição, documento, observações e centro de custo.",
                );
            }

            if (input.categoryId) {
                const [cat] = await tx
                    .select({ id: financialCategories.id })
                    .from(financialCategories)
                    .where(
                        and(
                            eq(financialCategories.id, input.categoryId),
                            eq(financialCategories.companyId, existing.companyId),
                            eq(financialCategories.active, true),
                        ),
                    )
                    .limit(1);
                if (!cat) {
                    throw new FinanceDomainError(
                        404,
                        "CATEGORY_NOT_FOUND",
                        "Categoria financeira inválida para esta empresa.",
                    );
                }
            }

            if (input.costCenterId) {
                const [cc] = await tx
                    .select({ id: costCenters.id })
                    .from(costCenters)
                    .where(
                        and(
                            eq(costCenters.id, input.costCenterId),
                            eq(costCenters.companyId, existing.companyId),
                            eq(costCenters.active, true),
                        ),
                    )
                    .limit(1);
                if (!cc) {
                    throw new FinanceDomainError(
                        404,
                        "COST_CENTER_NOT_FOUND",
                        "Centro de custo inválido para esta empresa.",
                    );
                }
            }

            let resolvedCounterparty:
                | {
                      clientId: string;
                      counterpartyName: string;
                      counterpartyDocument: string | null;
                  }
                | undefined;

            if (input.clientId !== undefined) {
                const [cli] = await tx
                    .select({
                        id: clients.id,
                        tradeName: clients.tradeName,
                        registeredCompanyName: clients.registeredCompanyName,
                        cnpj: clients.cnpj,
                        cpf: clients.cpf,
                    })
                    .from(clients)
                    .where(
                        and(
                            eq(clients.id, input.clientId),
                            eq(clients.companyId, existing.companyId),
                            eq(clients.active, true),
                            sql`${clients.anonymizedAt} IS NULL`,
                        ),
                    )
                    .limit(1);
                if (!cli) {
                    throw new FinanceDomainError(
                        404,
                        "CLIENT_NOT_FOUND",
                        "Cliente/Fornecedor não encontrado ou inativo nesta empresa.",
                    );
                }
                resolvedCounterparty = {
                    clientId: cli.id,
                    counterpartyName: cli.tradeName || cli.registeredCompanyName,
                    counterpartyDocument: cli.cnpj
                        ? cli.cnpj
                        : cli.cpf && cli.cpf.length >= 4
                          ? `***.***.***-${cli.cpf.slice(-2)}`
                          : null,
                };
            }

            const { nextOriginal, nextDiscount, nextInterest, nextFine, nextNet } =
                runMonetaryCalculation(() => {
                    const orig =
                        input.originalAmountCents !== undefined
                            ? intToCents(input.originalAmountCents, { positive: true })
                            : existing.originalAmountCents;
                    const disc =
                        input.discountCents !== undefined
                            ? intToCents(input.discountCents)
                            : existing.discountCents;
                    const intr =
                        input.interestCents !== undefined
                            ? intToCents(input.interestCents)
                            : existing.interestCents;
                    const fine =
                        input.fineCents !== undefined
                            ? intToCents(input.fineCents)
                            : existing.fineCents;

                    const net = calculateEntryNetCents({
                        originalAmountCents: orig,
                        discountCents: disc,
                        interestCents: intr,
                        fineCents: fine,
                    });
                    return {
                        nextOriginal: orig,
                        nextDiscount: disc,
                        nextInterest: intr,
                        nextFine: fine,
                        nextNet: net,
                    };
                });

            const nextDueDate = input.dueDate ?? existing.dueDate;
            const today = todayIsoUtc();

            let nextStatus = existing.status;
            if (existing.settledAmountCents === 0n) {
                const requestedStatus = input.status ?? existing.status;
                nextStatus =
                    requestedStatus === "draft"
                        ? "draft"
                        : nextDueDate < today
                          ? "overdue"
                          : "pending";
            }

            const [updated] = await tx
                .update(financialEntries)
                .set({
                    status: nextStatus,
                    ...(input.description !== undefined
                        ? { description: input.description }
                        : {}),
                    ...(input.documentNumber !== undefined
                        ? { documentNumber: input.documentNumber }
                        : {}),
                    ...(input.notes !== undefined ? { notes: input.notes } : {}),
                    ...(resolvedCounterparty
                        ? {
                              clientId: resolvedCounterparty.clientId,
                              counterpartyName: resolvedCounterparty.counterpartyName,
                              counterpartyDocument:
                                  resolvedCounterparty.counterpartyDocument,
                          }
                        : accountType === "personal" &&
                            !existing.clientId &&
                            input.counterpartyName !== undefined
                          ? {
                                counterpartyName:
                                    input.counterpartyName?.trim() || "Não informado",
                            }
                          : {}),
                    ...(input.categoryId !== undefined
                        ? { categoryId: input.categoryId }
                        : {}),
                    ...(input.costCenterId !== undefined
                        ? { costCenterId: input.costCenterId }
                        : {}),
                    ...(input.competenceDate !== undefined
                        ? { competenceDate: input.competenceDate }
                        : {}),
                    ...(input.issueDate !== undefined
                        ? { issueDate: input.issueDate }
                        : {}),
                    dueDate: nextDueDate,
                    originalAmountCents: nextOriginal,
                    discountCents: nextDiscount,
                    interestCents: nextInterest,
                    fineCents: nextFine,
                    netAmountCents: nextNet,
                })
                .where(eq(financialEntries.id, id))
                .returning();

            return serializeEntry(updated);
        });
    }

    async cancelEntry(
        id: string,
        companyIds: string[],
        userId: string,
        reason: string,
    ) {
        return db.transaction(async (tx) => {
            const [existing] = await tx
                .select()
                .from(financialEntries)
                .where(
                    and(
                        eq(financialEntries.id, id),
                        inArray(financialEntries.companyId, companyIds),
                    ),
                )
                .for("update")
                .limit(1);

            if (!existing) {
                throw new FinanceDomainError(
                    404,
                    "ENTRY_NOT_FOUND",
                    "Título financeiro não encontrado.",
                );
            }

            if (existing.status === "cancelled") {
                throw new FinanceDomainError(
                    409,
                    "ENTRY_ALREADY_CANCELLED",
                    "Título financeiro já está cancelado.",
                );
            }

            if (existing.settledAmountCents > 0n || existing.status === "paid") {
                throw new FinanceDomainError(
                    409,
                    "CANNOT_CANCEL_SETTLED_ENTRY",
                    "Estorne todas as baixas do título antes de cancelá-lo.",
                );
            }

            const [updated] = await tx
                .update(financialEntries)
                .set({
                    status: "cancelled",
                    cancelledBy: userId,
                    cancelledAt: new Date(),
                    cancelReason: reason,
                })
                .where(eq(financialEntries.id, id))
                .returning();

            return serializeEntry(updated);
        });
    }

    // -------------------- Settlements & Reversals (Append-Only) --------------------
    async settleEntry(input: {
        entryId: string;
        companyIds: string[];
        userId: string;
        idempotencyKey: string;
        rawPayloadForHash: unknown;
        accountId: string;
        paymentMethod: string;
        settledAt: Date;
        principalCents: number;
        interestCents: number;
        fineCents: number;
        discountCents: number;
        gatewayFeeCents: number;
        notes?: string | null;
    }) {
        const endpoint = `POST /finance/entries/${input.entryId}/settle`;
        const requestHash = hashIdempotencyPayload(input.rawPayloadForHash);

        try {
            return await db.transaction(async (tx) => {
            // 1. Lock entry first (deadlock prevention: always entry -> account)
            const [entry] = await tx
                .select()
                .from(financialEntries)
                .where(
                    and(
                        eq(financialEntries.id, input.entryId),
                        inArray(financialEntries.companyId, input.companyIds),
                    ),
                )
                .for("update")
                .limit(1);

            if (!entry) {
                throw new FinanceDomainError(
                    404,
                    "ENTRY_NOT_FOUND",
                    "Título financeiro não encontrado.",
                );
            }

            // Check idempotency scoped to entry.companyId
            const [existingIdemp] = await tx
                .select()
                .from(financialIdempotencyKeys)
                .where(
                    and(
                        eq(financialIdempotencyKeys.companyId, entry.companyId),
                        eq(financialIdempotencyKeys.endpoint, endpoint),
                        eq(financialIdempotencyKeys.idempotencyKey, input.idempotencyKey),
                    ),
                )
                .limit(1);

            if (existingIdemp) {
                if (existingIdemp.requestHash !== requestHash) {
                    throw new FinanceDomainError(
                        409,
                        "IDEMPOTENCY_KEY_CONFLICT",
                        "Idempotency-Key já utilizada com payload diferente.",
                    );
                }
                return {
                    replayed: true,
                    statusCode: existingIdemp.responseStatus,
                    payload: JSON.parse(existingIdemp.responseBody),
                };
            }

            if (
                entry.status === "draft" ||
                entry.status === "paid" ||
                entry.status === "cancelled"
            ) {
                throw new FinanceDomainError(
                    409,
                    "ENTRY_NOT_SETTLEABLE",
                    `Título em status '${entry.status}' não aceita novas baixas.`,
                );
            }

            const [reusedSettlementKey] = await tx
                .select({ id: financialSettlements.id })
                .from(financialSettlements)
                .where(
                    and(
                        eq(financialSettlements.companyId, entry.companyId),
                        eq(financialSettlements.idempotencyKey, input.idempotencyKey),
                    ),
                )
                .limit(1);

            if (reusedSettlementKey) {
                throw new FinanceDomainError(
                    409,
                    "IDEMPOTENCY_KEY_CONFLICT",
                    "Idempotency-Key já utilizada em outra baixa ou estorno.",
                );
            }

            // 2. Lock financial account second
            const [account] = await tx
                .select()
                .from(financialAccounts)
                .where(
                    and(
                        eq(financialAccounts.id, input.accountId),
                        eq(financialAccounts.companyId, entry.companyId),
                    ),
                )
                .for("update")
                .limit(1);

            if (!account) {
                throw new FinanceDomainError(
                    404,
                    "ACCOUNT_NOT_FOUND",
                    "Conta financeira não encontrada na empresa do título.",
                );
            }

            if (!account.active) {
                throw new FinanceDomainError(
                    409,
                    "ACCOUNT_INACTIVE",
                    "Conta financeira inativa não pode receber movimentações.",
                );
            }

            const principalCents = intToCents(input.principalCents, { positive: true });
            const interestCents = intToCents(input.interestCents);
            const fineCents = intToCents(input.fineCents);
            const discountCents = intToCents(input.discountCents);
            const gatewayFeeCents = intToCents(input.gatewayFeeCents);

            const remainingCents = entry.netAmountCents - entry.settledAmountCents;
            if (principalCents > remainingCents) {
                throw new FinanceDomainError(
                    409,
                    "PRINCIPAL_EXCEEDS_REMAINING",
                    `Valor principal (${principalCents.toString()}) excede o saldo em aberto do título (${remainingCents.toString()}).`,
                );
            }

            let totals: { totalSettledCents: bigint; accountDeltaCents: bigint };
            try {
                totals = calculateSettlementTotals({
                    entryType: entry.entryType as EntryType,
                    principalCents,
                    interestCents,
                    fineCents,
                    discountCents,
                    gatewayFeeCents,
                });
            } catch (err) {
                throw new FinanceDomainError(
                    400,
                    err instanceof Error ? err.message : "INVALID_SETTLEMENT",
                    "Valores da baixa inválidos.",
                );
            }

            const newSettledAmountCents = entry.settledAmountCents + principalCents;
            const newStatus = computeEntryStatusAfterSettlement({
                netAmountCents: entry.netAmountCents,
                newSettledAmountCents,
                dueDate: entry.dueDate,
                todayIso: todayIsoUtc(),
            });

            const [createdSettlement] = await tx
                .insert(financialSettlements)
                .values({
                    companyId: entry.companyId,
                    entryId: entry.id,
                    accountId: account.id,
                    settlementType: "payment",
                    reversedSettlementId: null,
                    paymentMethod: input.paymentMethod,
                    settledAt: input.settledAt,
                    principalCents,
                    interestCents,
                    fineCents,
                    discountCents,
                    gatewayFeeCents,
                    totalSettledCents: totals.totalSettledCents,
                    idempotencyKey: input.idempotencyKey,
                    createdBy: input.userId,
                    notes: input.notes ?? null,
                })
                .returning();

            const newBalanceCents =
                account.currentBalanceCents + totals.accountDeltaCents;

            await tx
                .update(financialAccounts)
                .set({
                    currentBalanceCents: newBalanceCents,
                })
                .where(eq(financialAccounts.id, account.id));

            const [updatedEntry] = await tx
                .update(financialEntries)
                .set({
                    settledAmountCents: newSettledAmountCents,
                    status: newStatus,
                    paidAt: newStatus === "paid" ? input.settledAt : null,
                })
                .where(eq(financialEntries.id, entry.id))
                .returning();

            const responsePayload = {
                message: "Baixa financeira registrada com sucesso",
                entry: serializeEntry(updatedEntry),
                settlement: serializeSettlement(createdSettlement, account.name),
                accountCurrentBalanceCents: centsToSafeNumber(newBalanceCents),
            };

            await tx.insert(financialIdempotencyKeys).values({
                companyId: entry.companyId,
                endpoint,
                idempotencyKey: input.idempotencyKey,
                requestHash,
                responseStatus: 201,
                responseBody: JSON.stringify(responsePayload),
                createdBy: input.userId,
            });

            return {
                replayed: false,
                statusCode: 201,
                payload: responsePayload,
            };
        });
        } catch (err) {
            if (getPgUniqueViolationConstraint(err)) {
                const [existingIdemp] = await db
                    .select()
                    .from(financialIdempotencyKeys)
                    .where(
                        and(
                            inArray(financialIdempotencyKeys.companyId, input.companyIds),
                            eq(financialIdempotencyKeys.endpoint, endpoint),
                            eq(
                                financialIdempotencyKeys.idempotencyKey,
                                input.idempotencyKey,
                            ),
                        ),
                    )
                    .limit(1);

                if (existingIdemp && existingIdemp.requestHash === requestHash) {
                    return {
                        replayed: true,
                        statusCode: existingIdemp.responseStatus,
                        payload: JSON.parse(existingIdemp.responseBody),
                    };
                }

                throw new FinanceDomainError(
                    409,
                    "IDEMPOTENCY_KEY_CONFLICT",
                    "Idempotency-Key já utilizada em outra operação ou com payload diferente.",
                );
            }
            throw err;
        }
    }

    async reverseSettlement(input: {
        settlementId: string;
        companyIds: string[];
        userId: string;
        idempotencyKey: string;
        rawPayloadForHash: unknown;
        reason: string;
        settledAt: Date;
    }) {
        const endpoint = `POST /finance/settlements/${input.settlementId}/reverse`;
        const requestHash = hashIdempotencyPayload(input.rawPayloadForHash);

        try {
            return await db.transaction(async (tx) => {
            const [original] = await tx
                .select()
                .from(financialSettlements)
                .where(
                    and(
                        eq(financialSettlements.id, input.settlementId),
                        inArray(financialSettlements.companyId, input.companyIds),
                    ),
                )
                .for("update")
                .limit(1);

            if (!original) {
                throw new FinanceDomainError(
                    404,
                    "SETTLEMENT_NOT_FOUND",
                    "Baixa financeira não encontrada.",
                );
            }

            const [existingIdemp] = await tx
                .select()
                .from(financialIdempotencyKeys)
                .where(
                    and(
                        eq(financialIdempotencyKeys.companyId, original.companyId),
                        eq(financialIdempotencyKeys.endpoint, endpoint),
                        eq(financialIdempotencyKeys.idempotencyKey, input.idempotencyKey),
                    ),
                )
                .limit(1);

            if (existingIdemp) {
                if (existingIdemp.requestHash !== requestHash) {
                    throw new FinanceDomainError(
                        409,
                        "IDEMPOTENCY_KEY_CONFLICT",
                        "Idempotency-Key já utilizada com payload diferente.",
                    );
                }
                return {
                    replayed: true,
                    statusCode: existingIdemp.responseStatus,
                    payload: JSON.parse(existingIdemp.responseBody),
                };
            }

            if (original.settlementType === "reversal") {
                throw new FinanceDomainError(
                    409,
                    "CANNOT_REVERSE_REVERSAL",
                    "Um lançamento de estorno não pode ser estornado novamente.",
                );
            }

            const [reusedSettlementKey] = await tx
                .select({ id: financialSettlements.id })
                .from(financialSettlements)
                .where(
                    and(
                        eq(financialSettlements.companyId, original.companyId),
                        eq(financialSettlements.idempotencyKey, input.idempotencyKey),
                    ),
                )
                .limit(1);

            if (reusedSettlementKey) {
                throw new FinanceDomainError(
                    409,
                    "IDEMPOTENCY_KEY_CONFLICT",
                    "Idempotency-Key já utilizada em outra baixa ou estorno.",
                );
            }

            const [alreadyReversed] = await tx
                .select({ id: financialSettlements.id })
                .from(financialSettlements)
                .where(eq(financialSettlements.reversedSettlementId, original.id))
                .limit(1);

            if (alreadyReversed) {
                throw new FinanceDomainError(
                    409,
                    "SETTLEMENT_ALREADY_REVERSED",
                    "Esta baixa já foi estornada anteriormente.",
                );
            }

            // Lock entry first, then account (consistent ordering)
            const [entry] = await tx
                .select()
                .from(financialEntries)
                .where(eq(financialEntries.id, original.entryId))
                .for("update")
                .limit(1);

            const [account] = await tx
                .select()
                .from(financialAccounts)
                .where(eq(financialAccounts.id, original.accountId))
                .for("update")
                .limit(1);

            if (!entry || !account) {
                throw new FinanceDomainError(
                    404,
                    "RELATED_RECORD_NOT_FOUND",
                    "Título ou conta vinculada não encontrados.",
                );
            }

            const originalImpact = calculateSettlementTotals({
                entryType: entry.entryType as EntryType,
                principalCents: original.principalCents,
                interestCents: original.interestCents,
                fineCents: original.fineCents,
                discountCents: original.discountCents,
                gatewayFeeCents: original.gatewayFeeCents,
            }).accountDeltaCents;

            const reversalAccountDelta = -originalImpact;
            const newSettledAmountCents =
                entry.settledAmountCents - original.principalCents;

            if (newSettledAmountCents < 0n) {
                throw new FinanceDomainError(
                    409,
                    "SETTLED_BALANCE_CORRUPTED",
                    "Saldo liquidado ficaria negativo após estorno.",
                );
            }

            const newStatus = computeEntryStatusAfterSettlement({
                netAmountCents: entry.netAmountCents,
                newSettledAmountCents,
                dueDate: entry.dueDate,
                todayIso: todayIsoUtc(),
            });

            const [createdReversal] = await tx
                .insert(financialSettlements)
                .values({
                    companyId: original.companyId,
                    entryId: entry.id,
                    accountId: account.id,
                    settlementType: "reversal",
                    reversedSettlementId: original.id,
                    paymentMethod: original.paymentMethod,
                    settledAt: input.settledAt,
                    principalCents: original.principalCents,
                    interestCents: original.interestCents,
                    fineCents: original.fineCents,
                    discountCents: original.discountCents,
                    gatewayFeeCents: original.gatewayFeeCents,
                    totalSettledCents: original.totalSettledCents,
                    idempotencyKey: input.idempotencyKey,
                    createdBy: input.userId,
                    notes: `Estorno: ${input.reason}`,
                })
                .returning();

            const newBalanceCents =
                account.currentBalanceCents + reversalAccountDelta;

            await tx
                .update(financialAccounts)
                .set({
                    currentBalanceCents: newBalanceCents,
                })
                .where(eq(financialAccounts.id, account.id));

            const [updatedEntry] = await tx
                .update(financialEntries)
                .set({
                    settledAmountCents: newSettledAmountCents,
                    status: newStatus,
                    paidAt: newStatus === "paid" ? entry.paidAt : null,
                })
                .where(eq(financialEntries.id, entry.id))
                .returning();

            const responsePayload = {
                message: "Estorno financeiro registrado com sucesso",
                entry: serializeEntry(updatedEntry),
                settlement: serializeSettlement(createdReversal, account.name),
                accountCurrentBalanceCents: centsToSafeNumber(newBalanceCents),
            };

            await tx.insert(financialIdempotencyKeys).values({
                companyId: original.companyId,
                endpoint,
                idempotencyKey: input.idempotencyKey,
                requestHash,
                responseStatus: 201,
                responseBody: JSON.stringify(responsePayload),
                createdBy: input.userId,
            });

            return {
                replayed: false,
                statusCode: 201,
                payload: responsePayload,
            };
        });
        } catch (err) {
            if (getPgUniqueViolationConstraint(err)) {
                const [existingIdemp] = await db
                    .select()
                    .from(financialIdempotencyKeys)
                    .where(
                        and(
                            inArray(financialIdempotencyKeys.companyId, input.companyIds),
                            eq(financialIdempotencyKeys.endpoint, endpoint),
                            eq(
                                financialIdempotencyKeys.idempotencyKey,
                                input.idempotencyKey,
                            ),
                        ),
                    )
                    .limit(1);

                if (existingIdemp && existingIdemp.requestHash === requestHash) {
                    return {
                        replayed: true,
                        statusCode: existingIdemp.responseStatus,
                        payload: JSON.parse(existingIdemp.responseBody),
                    };
                }

                throw new FinanceDomainError(
                    409,
                    "IDEMPOTENCY_KEY_CONFLICT",
                    "Idempotency-Key já utilizada em outra operação ou com payload diferente.",
                );
            }
            throw err;
        }
    }

    // -------------------- Reports --------------------
    async getCashflowReport(input: {
        companyIds: string[];
        from: string;
        to: string;
        excludeIntercompany: boolean;
    }) {
        if (input.from > input.to) {
            throw new FinanceDomainError(
                400,
                "INVALID_DATE_RANGE",
                "Data inicial não pode ser maior que a data final.",
            );
        }
        const rangeDays = diffDaysIso(input.to, input.from);
        if (rangeDays > 366) {
            throw new FinanceDomainError(
                400,
                "DATE_RANGE_TOO_LARGE",
                "Janela máxima de fluxo de caixa é de 366 dias.",
            );
        }

        const accounts = await db
            .select({
                currentBalanceCents: financialAccounts.currentBalanceCents,
            })
            .from(financialAccounts)
            .where(
                and(
                    inArray(financialAccounts.companyId, input.companyIds),
                    eq(financialAccounts.active, true),
                ),
            );

        let currentAccountsBalanceCents = 0n;
        for (const acc of accounts) {
            currentAccountsBalanceCents += acc.currentBalanceCents;
        }

        const fromTs = new Date(`${input.from}T00:00:00.000Z`);
        const toTs = new Date(`${input.to}T23:59:59.999Z`);

        const settlementRows = await db
            .select({
                settledAt: financialSettlements.settledAt,
                settlementType: financialSettlements.settlementType,
                totalSettledCents: financialSettlements.totalSettledCents,
                gatewayFeeCents: financialSettlements.gatewayFeeCents,
                entryType: financialEntries.entryType,
                isIntercompany: financialEntries.isIntercompany,
            })
            .from(financialSettlements)
            .innerJoin(
                financialEntries,
                eq(financialSettlements.entryId, financialEntries.id),
            )
            .where(
                and(
                    inArray(financialSettlements.companyId, input.companyIds),
                    gte(financialSettlements.settledAt, fromTs),
                    lte(financialSettlements.settledAt, toTs),
                    ...(input.excludeIntercompany
                        ? [eq(financialEntries.isIntercompany, false)]
                        : []),
                ),
            );

        const openEntries = await db
            .select({
                entryType: financialEntries.entryType,
                dueDate: financialEntries.dueDate,
                netAmountCents: financialEntries.netAmountCents,
                settledAmountCents: financialEntries.settledAmountCents,
                isIntercompany: financialEntries.isIntercompany,
            })
            .from(financialEntries)
            .where(
                and(
                    inArray(financialEntries.companyId, input.companyIds),
                    inArray(financialEntries.status, [
                        "pending",
                        "partially_paid",
                        "overdue",
                    ]),
                    lte(financialEntries.dueDate, input.to),
                    ...(input.excludeIntercompany
                        ? [eq(financialEntries.isIntercompany, false)]
                        : []),
                ),
            );

        type DailyBucket = {
            realizedInflowCents: bigint;
            realizedOutflowCents: bigint;
            projectedInflowCents: bigint;
            projectedOutflowCents: bigint;
        };

        const byDate = new Map<string, DailyBucket>();
        const getBucket = (dateKey: string): DailyBucket => {
            let b = byDate.get(dateKey);
            if (!b) {
                b = {
                    realizedInflowCents: 0n,
                    realizedOutflowCents: 0n,
                    projectedInflowCents: 0n,
                    projectedOutflowCents: 0n,
                };
                byDate.set(dateKey, b);
            }
            return b;
        };

        let realizedInflowCents = 0n;
        let realizedOutflowCents = 0n;

        for (const s of settlementRows) {
            const dateKey = s.settledAt.toISOString().slice(0, 10);
            const bucket = getBucket(dateKey);
            const sign = s.settlementType === "reversal" ? -1n : 1n;

            if (s.entryType === "receivable") {
                const netCashIn = (s.totalSettledCents - s.gatewayFeeCents) * sign;
                bucket.realizedInflowCents += netCashIn;
                realizedInflowCents += netCashIn;
            } else {
                const cashOut = (s.totalSettledCents + s.gatewayFeeCents) * sign;
                bucket.realizedOutflowCents += cashOut;
                realizedOutflowCents += cashOut;
            }
        }

        let projectedInflowCents = 0n;
        let projectedOutflowCents = 0n;
        let overdueReceivablePriorCents = 0n;
        let overduePayablePriorCents = 0n;

        for (const e of openEntries) {
            const remaining = e.netAmountCents - e.settledAmountCents;
            if (remaining <= 0n) continue;

            if (e.dueDate < input.from) {
                if (e.entryType === "receivable") {
                    overdueReceivablePriorCents += remaining;
                } else {
                    overduePayablePriorCents += remaining;
                }
                continue;
            }

            const bucket = getBucket(e.dueDate);
            if (e.entryType === "receivable") {
                bucket.projectedInflowCents += remaining;
                projectedInflowCents += remaining;
            } else {
                bucket.projectedOutflowCents += remaining;
                projectedOutflowCents += remaining;
            }
        }

        const series = Array.from(byDate.entries())
            .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
            .map(([date, b]) => {
                const net =
                    b.realizedInflowCents -
                    b.realizedOutflowCents +
                    (b.projectedInflowCents - b.projectedOutflowCents);
                return {
                    date,
                    realizedInflowCents: centsToSafeNumber(b.realizedInflowCents),
                    realizedOutflowCents: centsToSafeNumber(b.realizedOutflowCents),
                    projectedInflowCents: centsToSafeNumber(b.projectedInflowCents),
                    projectedOutflowCents: centsToSafeNumber(b.projectedOutflowCents),
                    netCents: centsToSafeNumber(net),
                };
            });

        return {
            period: { from: input.from, to: input.to },
            summary: {
                currentAccountsBalanceCents: centsToSafeNumber(
                    currentAccountsBalanceCents,
                ),
                realizedInflowCents: centsToSafeNumber(realizedInflowCents),
                realizedOutflowCents: centsToSafeNumber(realizedOutflowCents),
                realizedNetCents: centsToSafeNumber(
                    realizedInflowCents - realizedOutflowCents,
                ),
                projectedInflowCents: centsToSafeNumber(projectedInflowCents),
                projectedOutflowCents: centsToSafeNumber(projectedOutflowCents),
                projectedNetCents: centsToSafeNumber(
                    projectedInflowCents - projectedOutflowCents,
                ),
                overdueReceivablePriorCents: centsToSafeNumber(
                    overdueReceivablePriorCents,
                ),
                overduePayablePriorCents: centsToSafeNumber(overduePayablePriorCents),
            },
            series,
        };
    }

    async getAgingReport(input: {
        companyIds: string[];
        referenceDate: string;
        excludeIntercompany: boolean;
    }) {
        const rows = await db
            .select({
                entryType: financialEntries.entryType,
                dueDate: financialEntries.dueDate,
                netAmountCents: financialEntries.netAmountCents,
                settledAmountCents: financialEntries.settledAmountCents,
            })
            .from(financialEntries)
            .where(
                and(
                    inArray(financialEntries.companyId, input.companyIds),
                    inArray(financialEntries.status, [
                        "pending",
                        "partially_paid",
                        "overdue",
                    ]),
                    ...(input.excludeIntercompany
                        ? [eq(financialEntries.isIntercompany, false)]
                        : []),
                ),
            );

        const makeEmpty = () => ({
            upcomingCents: 0n,
            overdue1to15Cents: 0n,
            overdue16to30Cents: 0n,
            overdue31to60Cents: 0n,
            overdue61PlusCents: 0n,
            totalOpenCents: 0n,
            totalOverdueCents: 0n,
            openCount: 0,
            overdueCount: 0,
        });

        const rec = makeEmpty();
        const pay = makeEmpty();

        for (const row of rows) {
            const remaining = row.netAmountCents - row.settledAmountCents;
            if (remaining <= 0n) continue;

            const target = row.entryType === "receivable" ? rec : pay;
            target.totalOpenCents += remaining;
            target.openCount += 1;

            const overdueDays = diffDaysIso(input.referenceDate, row.dueDate);
            if (overdueDays <= 0) {
                target.upcomingCents += remaining;
            } else {
                target.totalOverdueCents += remaining;
                target.overdueCount += 1;
                if (overdueDays <= 15) {
                    target.overdue1to15Cents += remaining;
                } else if (overdueDays <= 30) {
                    target.overdue16to30Cents += remaining;
                } else if (overdueDays <= 60) {
                    target.overdue31to60Cents += remaining;
                } else {
                    target.overdue61PlusCents += remaining;
                }
            }
        }

        const finalize = (b: ReturnType<typeof makeEmpty>) => {
            const rateBps =
                b.totalOpenCents > 0n
                    ? Number((b.totalOverdueCents * 10000n) / b.totalOpenCents)
                    : 0;
            return {
                upcomingCents: centsToSafeNumber(b.upcomingCents),
                overdue1to15Cents: centsToSafeNumber(b.overdue1to15Cents),
                overdue16to30Cents: centsToSafeNumber(b.overdue16to30Cents),
                overdue31to60Cents: centsToSafeNumber(b.overdue31to60Cents),
                overdue61PlusCents: centsToSafeNumber(b.overdue61PlusCents),
                totalOpenCents: centsToSafeNumber(b.totalOpenCents),
                totalOverdueCents: centsToSafeNumber(b.totalOverdueCents),
                delinquencyRateBps: rateBps,
                openCount: b.openCount,
                overdueCount: b.overdueCount,
            };
        };

        return {
            referenceDate: input.referenceDate,
            receivable: finalize(rec),
            payable: finalize(pay),
        };
    }

    async getEntriesForExport(input: {
        companyIds: string[];
        from?: string;
        to?: string;
        entryType?: EntryType;
        excludeIntercompany: boolean;
    }) {
        if (input.from && input.to && input.from > input.to) {
            throw new FinanceDomainError(
                400,
                "INVALID_DATE_RANGE",
                "Data inicial não pode ser maior que a data final.",
            );
        }
        const conditions = [inArray(financialEntries.companyId, input.companyIds)];
        if (input.from) {
            conditions.push(gte(financialEntries.dueDate, input.from));
        }
        if (input.to) {
            conditions.push(lte(financialEntries.dueDate, input.to));
        }
        if (input.entryType) {
            conditions.push(eq(financialEntries.entryType, input.entryType));
        }
        if (input.excludeIntercompany) {
            conditions.push(eq(financialEntries.isIntercompany, false));
        }

        const rows = await db
            .select({
                entry: financialEntries,
                categoryCode: financialCategories.code,
                categoryName: financialCategories.name,
                costCenterName: costCenters.name,
            })
            .from(financialEntries)
            .leftJoin(
                financialCategories,
                eq(financialEntries.categoryId, financialCategories.id),
            )
            .leftJoin(
                costCenters,
                eq(financialEntries.costCenterId, costCenters.id),
            )
            .where(and(...conditions))
            .orderBy(asc(financialEntries.dueDate), asc(financialEntries.createdAt))
            .limit(5000);

        return rows;
    }
}

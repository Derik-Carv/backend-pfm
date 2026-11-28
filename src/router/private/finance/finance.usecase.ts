import { db } from "@/database/index";
import { financialCategories, nf, services } from "@/database/schema/schema";
import {
    FinanceDomainError,
    FinanceRepository,
    todayIsoUtc,
} from "@/database/tables/finance/finance.repository";
import { buildCsv } from "@/lib/finance/csv";
import { ensureDefaultFinancialCategories } from "@/lib/finance/defaultCategories";
import { extractIdempotencyKey } from "@/lib/finance/idempotency";
import {
    centsToDecimalString,
    centsToSafeNumber,
    parseDecimalToCents,
} from "@/lib/finance/money";
import { and, eq } from "drizzle-orm";

export interface TenantRequestContext {
    activeCompanyId: string;
    motherId: string;
    accessibleCompanyIds: string[];
    isConsolidated: boolean;
    userId: string;
}

export class FinanceUseCase {
    private readonly repo = new FinanceRepository();

    private assertIdempotencyKey(rawHeader: unknown): string {
        try {
            return extractIdempotencyKey(rawHeader);
        } catch (err) {
            const code = err instanceof Error ? err.message : "INVALID_IDEMPOTENCY_KEY";
            throw new FinanceDomainError(
                400,
                code,
                "Header Idempotency-Key obrigatório (8 a 128 caracteres alfanuméricos, '.', '_', ':' ou '-').",
            );
        }
    }

    // ---------------- Accounts ----------------
    async listAccounts(tenant: TenantRequestContext) {
        const result = await this.repo.listAccounts(tenant.accessibleCompanyIds);
        return {
            message: "Contas financeiras recuperadas com sucesso",
            ...result,
        };
    }

    async createAccount(
        tenant: TenantRequestContext,
        body: {
            name: string;
            type: string;
            bankCode?: string | null;
            agencyMasked?: string | null;
            accountMasked?: string | null;
            initialBalanceCents: number;
            initialBalanceDate: string;
        },
    ) {
        const account = await this.repo.createAccount({
            companyId: tenant.activeCompanyId,
            ...body,
        });
        return {
            message: "Conta financeira criada com sucesso",
            account,
        };
    }

    async updateAccount(
        tenant: TenantRequestContext,
        id: string,
        body: {
            name?: string;
            bankCode?: string | null;
            agencyMasked?: string | null;
            accountMasked?: string | null;
            active?: boolean;
        },
    ) {
        const account = await this.repo.updateAccount(
            id,
            tenant.accessibleCompanyIds,
            body,
        );
        return {
            message: "Conta financeira atualizada com sucesso",
            account,
        };
    }

    // ---------------- Categories ----------------
    async listCategories(tenant: TenantRequestContext) {
        const categories = await this.repo.listCategories(
            tenant.activeCompanyId,
            tenant.accessibleCompanyIds,
        );
        return {
            message: "Categorias financeiras recuperadas com sucesso",
            categories,
        };
    }

    async createCategory(
        tenant: TenantRequestContext,
        body: {
            parentId?: string | null;
            code: string;
            name: string;
            kind: string;
            dreGroup?: string | null;
        },
    ) {
        const category = await this.repo.createCategory({
            companyId: tenant.activeCompanyId,
            ...body,
        });
        return {
            message: "Categoria financeira criada com sucesso",
            category,
        };
    }

    async updateCategory(
        tenant: TenantRequestContext,
        id: string,
        body: {
            parentId?: string | null;
            name?: string;
            kind?: string;
            dreGroup?: string | null;
            active?: boolean;
        },
    ) {
        const category = await this.repo.updateCategory(
            id,
            tenant.accessibleCompanyIds,
            body,
        );
        return {
            message: "Categoria financeira atualizada com sucesso",
            category,
        };
    }

    // ---------------- Cost Centers ----------------
    async listCostCenters(tenant: TenantRequestContext) {
        const costCenters = await this.repo.listCostCenters(
            tenant.accessibleCompanyIds,
        );
        return {
            message: "Centros de custo recuperados com sucesso",
            costCenters,
        };
    }

    async createCostCenter(
        tenant: TenantRequestContext,
        body: { code: string; name: string },
    ) {
        const costCenter = await this.repo.createCostCenter({
            companyId: tenant.activeCompanyId,
            ...body,
        });
        return {
            message: "Centro de custo criado com sucesso",
            costCenter,
        };
    }

    async updateCostCenter(
        tenant: TenantRequestContext,
        id: string,
        body: { name?: string; active?: boolean },
    ) {
        const costCenter = await this.repo.updateCostCenter(
            id,
            tenant.accessibleCompanyIds,
            body,
        );
        return {
            message: "Centro de custo atualizado com sucesso",
            costCenter,
        };
    }

    // ---------------- Counterparties ----------------
    async listCounterparties(
        tenant: TenantRequestContext,
        query: { search?: string; limit: number },
    ) {
        const counterparties = await this.repo.listCounterparties(
            tenant.accessibleCompanyIds,
            query,
        );
        return {
            message: "Clientes/fornecedores recuperados com sucesso",
            counterparties,
        };
    }

    // ---------------- Entries ----------------
    async listEntries(
        tenant: TenantRequestContext,
        filters: Parameters<FinanceRepository["listEntries"]>[1],
    ) {
        const result = await this.repo.listEntries(tenant.accessibleCompanyIds, {
            ...filters,
            excludeIntercompany:
                filters.excludeIntercompany ?? tenant.isConsolidated,
        });
        return {
            message: "Títulos financeiros recuperados com sucesso",
            ...result,
        };
    }

    async getEntryById(tenant: TenantRequestContext, id: string) {
        const result = await this.repo.getEntryById(
            id,
            tenant.accessibleCompanyIds,
        );
        return {
            message: "Título financeiro recuperado com sucesso",
            ...result,
        };
    }

    async createEntries(
        tenant: TenantRequestContext,
        rawIdempotencyKey: unknown,
        body: {
            entryType: "receivable" | "payable";
            status: "draft" | "pending";
            description: string;
            documentNumber?: string | null;
            notes?: string | null;
            clientId: string;
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
        },
    ) {
        const idempotencyKey = this.assertIdempotencyKey(rawIdempotencyKey);
        return this.repo.createEntries({
            companyId: tenant.activeCompanyId,
            motherId: tenant.motherId,
            userId: tenant.userId,
            idempotencyKey,
            endpoint: "POST /finance/entries",
            rawPayloadForHash: body,
            ...body,
        });
    }

    async createEntryFromService(
        tenant: TenantRequestContext,
        serviceId: string,
        rawIdempotencyKey: unknown,
        body: {
            categoryId?: string;
            costCenterId?: string | null;
            nfId?: string | null;
            dueDate?: string;
            competenceDate?: string;
            issueDate?: string;
            totalInstallments: number;
            installmentDueDay?: number | null;
            description?: string;
            notes?: string | null;
        },
    ) {
        const idempotencyKey = this.assertIdempotencyKey(rawIdempotencyKey);

        const [service] = await db
            .select()
            .from(services)
            .where(
                and(
                    eq(services.id, serviceId),
                    eq(services.companyId, tenant.activeCompanyId),
                    eq(services.active, true),
                ),
            )
            .limit(1);

        if (!service) {
            throw new FinanceDomainError(
                404,
                "SERVICE_NOT_FOUND",
                "Serviço não encontrado ou inativo na empresa ativa.",
            );
        }

        let resolvedCategoryId = body.categoryId;
        if (!resolvedCategoryId) {
            await ensureDefaultFinancialCategories(tenant.activeCompanyId);
            const [defaultRevCat] = await db
                .select({ id: financialCategories.id })
                .from(financialCategories)
                .where(
                    and(
                        eq(financialCategories.companyId, tenant.activeCompanyId),
                        eq(financialCategories.code, "1.01"),
                    ),
                )
                .limit(1);
            if (!defaultRevCat) {
                throw new FinanceDomainError(
                    400,
                    "DEFAULT_REVENUE_CATEGORY_MISSING",
                    "Informe categoryId para lançar o título do serviço.",
                );
            }
            resolvedCategoryId = defaultRevCat.id;
        }

        let serviceCents: bigint;
        let serviceAmountNumber: number;
        try {
            serviceCents = parseDecimalToCents(service.price);
            serviceAmountNumber = centsToSafeNumber(serviceCents);
        } catch {
            throw new FinanceDomainError(
                400,
                "INVALID_SERVICE_PRICE",
                "O valor do serviço é inválido para gerar título financeiro.",
            );
        }
        if (serviceCents <= 0n) {
            throw new FinanceDomainError(
                400,
                "SERVICE_ZERO_PRICE",
                "Serviço possui valor zerado e não pode gerar título financeiro.",
            );
        }

        const warnings: string[] = [];
        let documentNumber: string | null = null;
        let issueDate = body.issueDate ?? service.initialDate ?? todayIsoUtc();

        if (body.nfId) {
            const [note] = await db
                .select()
                .from(nf)
                .where(
                    and(
                        eq(nf.id, body.nfId),
                        eq(nf.companyId, tenant.activeCompanyId),
                        eq(nf.active, true),
                    ),
                )
                .limit(1);
            if (!note) {
                throw new FinanceDomainError(
                    404,
                    "NF_NOT_FOUND",
                    "Nota fiscal vinculada não encontrada ou inativa.",
                );
            }
            if (
                note.servicesId !== service.id ||
                note.thirdPartyClientId !== service.clientId
            ) {
                throw new FinanceDomainError(
                    409,
                    "NF_SERVICE_MISMATCH",
                    "A nota fiscal informada não pertence a este serviço/cliente.",
                );
            }
            documentNumber = note.numberNf ?? null;
            issueDate = body.issueDate ?? note.emissionDate;
            const nfCents = parseDecimalToCents(note.totalValue);
            if (nfCents !== serviceCents) {
                warnings.push(
                    `Valor da NF (R$ ${centsToDecimalString(nfCents)}) diverge do valor do serviço (R$ ${centsToDecimalString(serviceCents)}).`,
                );
            }
        }

        const today = todayIsoUtc();
        const dueDate =
            body.dueDate ?? service.finishDate ?? service.initialDate ?? today;
        const competenceDate =
            body.competenceDate ?? service.finishDate ?? service.initialDate ?? today;

        const result = await this.repo.createEntries({
            companyId: tenant.activeCompanyId,
            motherId: tenant.motherId,
            userId: tenant.userId,
            idempotencyKey,
            endpoint: `POST /finance/entries/from-service/${serviceId}`,
            rawPayloadForHash: { serviceId, ...body },
            entryType: "receivable",
            status: "pending",
            description: body.description ?? `Serviço: ${service.serviceName}`,
            documentNumber,
            notes: body.notes ?? null,
            clientId: service.clientId,
            serviceId: service.id,
            nfId: body.nfId ?? null,
            categoryId: resolvedCategoryId,
            costCenterId: body.costCenterId ?? null,
            competenceDate,
            issueDate,
            dueDate,
            originalAmountCents: serviceAmountNumber,
            discountCents: 0,
            interestCents: 0,
            fineCents: 0,
            totalInstallments: body.totalInstallments,
            installmentDueDay: body.installmentDueDay ?? null,
            isIntercompany: false,
            counterpartyCompanyId: null,
        });

        if (warnings.length > 0) {
            result.payload.warnings = [
                ...(result.payload.warnings ?? []),
                ...warnings,
            ];
        }

        return result;
    }

    async updateEntry(
        tenant: TenantRequestContext,
        id: string,
        body: Parameters<FinanceRepository["updateEntry"]>[2],
    ) {
        const entry = await this.repo.updateEntry(
            id,
            tenant.accessibleCompanyIds,
            body,
        );
        return {
            message: "Título financeiro atualizado com sucesso",
            entry,
        };
    }

    async cancelEntry(
        tenant: TenantRequestContext,
        id: string,
        reason: string,
    ) {
        const entry = await this.repo.cancelEntry(
            id,
            tenant.accessibleCompanyIds,
            tenant.userId,
            reason,
        );
        return {
            message: "Título financeiro cancelado com sucesso",
            entry,
        };
    }

    async settleEntry(
        tenant: TenantRequestContext,
        entryId: string,
        rawIdempotencyKey: unknown,
        body: {
            accountId: string;
            paymentMethod: string;
            settledAt?: string;
            principalCents: number;
            interestCents: number;
            fineCents: number;
            discountCents: number;
            gatewayFeeCents: number;
            notes?: string | null;
        },
    ) {
        const idempotencyKey = this.assertIdempotencyKey(rawIdempotencyKey);
        return this.repo.settleEntry({
            entryId,
            companyIds: tenant.accessibleCompanyIds,
            userId: tenant.userId,
            idempotencyKey,
            rawPayloadForHash: { entryId, ...body },
            accountId: body.accountId,
            paymentMethod: body.paymentMethod,
            settledAt: body.settledAt ? new Date(body.settledAt) : new Date(),
            principalCents: body.principalCents,
            interestCents: body.interestCents,
            fineCents: body.fineCents,
            discountCents: body.discountCents,
            gatewayFeeCents: body.gatewayFeeCents,
            notes: body.notes ?? null,
        });
    }

    async reverseSettlement(
        tenant: TenantRequestContext,
        settlementId: string,
        rawIdempotencyKey: unknown,
        body: { reason: string; settledAt?: string },
    ) {
        const idempotencyKey = this.assertIdempotencyKey(rawIdempotencyKey);
        return this.repo.reverseSettlement({
            settlementId,
            companyIds: tenant.accessibleCompanyIds,
            userId: tenant.userId,
            idempotencyKey,
            rawPayloadForHash: { settlementId, ...body },
            reason: body.reason,
            settledAt: body.settledAt ? new Date(body.settledAt) : new Date(),
        });
    }

    // ---------------- Reports ----------------
    async getCashflowReport(
        tenant: TenantRequestContext,
        query: { from: string; to: string; excludeIntercompany?: boolean },
    ) {
        const report = await this.repo.getCashflowReport({
            companyIds: tenant.accessibleCompanyIds,
            from: query.from,
            to: query.to,
            excludeIntercompany:
                query.excludeIntercompany ?? tenant.isConsolidated,
        });
        return {
            message: "Fluxo de caixa calculado com sucesso",
            ...report,
        };
    }

    async getAgingReport(
        tenant: TenantRequestContext,
        query: { referenceDate?: string; excludeIntercompany?: boolean },
    ) {
        const report = await this.repo.getAgingReport({
            companyIds: tenant.accessibleCompanyIds,
            referenceDate: query.referenceDate ?? todayIsoUtc(),
            excludeIntercompany:
                query.excludeIntercompany ?? tenant.isConsolidated,
        });
        return {
            message: "Relatório de aging calculado com sucesso",
            ...report,
        };
    }

    async exportEntriesCsv(
        tenant: TenantRequestContext,
        query: {
            from?: string;
            to?: string;
            entryType?: "receivable" | "payable";
            excludeIntercompany?: boolean;
        },
    ): Promise<string> {
        const rows = await this.repo.getEntriesForExport({
            companyIds: tenant.accessibleCompanyIds,
            from: query.from,
            to: query.to,
            entryType: query.entryType,
            excludeIntercompany:
                query.excludeIntercompany ?? tenant.isConsolidated,
        });

        const headers = [
            "ID",
            "Tipo",
            "Status",
            "Descrição",
            "Documento",
            "Contraparte",
            "Categoria",
            "Centro de Custo",
            "Competência",
            "Emissão",
            "Vencimento",
            "Valor Líquido (R$)",
            "Valor Liquidado (R$)",
            "Saldo Aberto (R$)",
            "Parcela",
            "Intercompany",
        ];

        const csvRows = rows.map((r) => {
            const e = r.entry;
            const remaining = e.netAmountCents - e.settledAmountCents;
            return [
                e.id,
                e.entryType === "receivable" ? "A Receber" : "A Pagar",
                e.status,
                e.description,
                e.documentNumber ?? "",
                e.counterpartyName ?? "",
                r.categoryCode ? `${r.categoryCode} - ${r.categoryName ?? ""}` : "",
                r.costCenterName ?? "",
                e.competenceDate,
                e.issueDate,
                e.dueDate,
                centsToDecimalString(e.netAmountCents),
                centsToDecimalString(e.settledAmountCents),
                centsToDecimalString(remaining > 0n ? remaining : 0n),
                `${e.installmentNumber}/${e.totalInstallments}`,
                e.isIntercompany ? "Sim" : "Não",
            ];
        });

        return buildCsv(headers, csvRows);
    }
}

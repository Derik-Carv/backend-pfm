import { db as defaultDb } from "@/database/index";
import { financialCategories } from "@/database/schema/schema";
import { eq } from "drizzle-orm";

export interface DefaultCategorySeedItem {
    code: string;
    name: string;
    kind:
        | "revenue"
        | "deduction"
        | "direct_cost"
        | "operating_expense"
        | "financial_result"
        | "transfer";
    dreGroup:
        | "gross_revenue"
        | "taxes_and_deductions"
        | "cogs"
        | "sales_marketing"
        | "ga_admin"
        | "payroll"
        | "financial_income"
        | "financial_expense"
        | "non_operational";
}

export const DEFAULT_FINANCIAL_CATEGORIES: DefaultCategorySeedItem[] = [
    {
        code: "1.01",
        name: "Receita de Prestação de Serviços",
        kind: "revenue",
        dreGroup: "gross_revenue",
    },
    {
        code: "1.02",
        name: "Receita de Assinaturas / Contratos Recorrentes",
        kind: "revenue",
        dreGroup: "gross_revenue",
    },
    {
        code: "1.90",
        name: "Deduções e Impostos sobre Faturamento (ISS / Simples)",
        kind: "deduction",
        dreGroup: "taxes_and_deductions",
    },
    {
        code: "2.01",
        name: "Custos Diretos dos Serviços / Infraestrutura",
        kind: "direct_cost",
        dreGroup: "cogs",
    },
    {
        code: "3.01",
        name: "Pessoal, Salários e Pró-labore",
        kind: "operating_expense",
        dreGroup: "payroll",
    },
    {
        code: "3.02",
        name: "Despesas Administrativas e Operacionais",
        kind: "operating_expense",
        dreGroup: "ga_admin",
    },
    {
        code: "3.03",
        name: "Marketing e Despesas Comerciais",
        kind: "operating_expense",
        dreGroup: "sales_marketing",
    },
    {
        code: "4.01",
        name: "Receitas Financeiras e Juros Recebidos",
        kind: "financial_result",
        dreGroup: "financial_income",
    },
    {
        code: "4.02",
        name: "Taxas Bancárias, Gateway, Juros e Multas Pagos",
        kind: "financial_result",
        dreGroup: "financial_expense",
    },
    {
        code: "5.01",
        name: "Outras Receitas / Despesas Não Operacionais",
        kind: "operating_expense",
        dreGroup: "non_operational",
    },
    {
        code: "5.90",
        name: "Movimentação / Repasse Intercompany",
        kind: "transfer",
        dreGroup: "non_operational",
    },
];

type DbExecutor = Pick<typeof defaultDb, "select" | "insert">;

export async function ensureDefaultFinancialCategories(
    companyId: string,
    executor: DbExecutor = defaultDb,
): Promise<void> {
    const existing = await executor
        .select({ id: financialCategories.id })
        .from(financialCategories)
        .where(eq(financialCategories.companyId, companyId))
        .limit(1);

    if (existing.length > 0) {
        return;
    }

    await executor
        .insert(financialCategories)
        .values(
            DEFAULT_FINANCIAL_CATEGORIES.map((item) => ({
                companyId,
                code: item.code,
                name: item.name,
                kind: item.kind,
                dreGroup: item.dreGroup,
                isSystem: true,
                active: true,
            })),
        )
        .onConflictDoNothing({
            target: [financialCategories.companyId, financialCategories.code],
        });
}

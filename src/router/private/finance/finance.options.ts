import { rateLimitProfiles } from "@/policies/rateLimit";
import { errorResponseSchema } from "@/router/error.schema";
import {
    accountsListResponseSchema,
    agingQuerySchema,
    agingResponseSchema,
    cancelEntryBodySchema,
    cashflowQuerySchema,
    cashflowResponseSchema,
    categoriesListResponseSchema,
    costCentersListResponseSchema,
    counterpartiesListResponseSchema,
    createAccountBodySchema,
    createCategoryBodySchema,
    createCostCenterBodySchema,
    createdEntriesResponseSchema,
    createEntryBodySchema,
    createEntryFromServiceBodySchema,
    entriesListResponseSchema,
    exportReportQuerySchema,
    idParamsSchema,
    listCounterpartiesQuerySchema,
    listEntriesQuerySchema,
    reverseSettlementBodySchema,
    serviceIdParamsSchema,
    settleEntryBodySchema,
    settlementMutationResponseSchema,
    singleAccountResponseSchema,
    singleCategoryResponseSchema,
    singleCostCenterResponseSchema,
    singleEntryResponseSchema,
    updateAccountBodySchema,
    updateCategoryBodySchema,
    updateCostCenterBodySchema,
    updateEntryBodySchema,
} from "./finance.schemas";

const standardErrors = {
    400: errorResponseSchema,
    401: errorResponseSchema,
    403: errorResponseSchema,
    404: errorResponseSchema,
    409: errorResponseSchema,
    500: errorResponseSchema,
};

export const listAccountsOptions = {
    schema: {
        tags: ["Finance"],
        summary: "Listar contas financeiras e saldo consolidado",
        response: { 200: accountsListResponseSchema, ...standardErrors },
    },
};

export const createAccountOptions = {
    schema: {
        tags: ["Finance"],
        summary: "Criar conta financeira (caixa, banco ou carteira)",
        body: createAccountBodySchema,
        response: { 201: singleAccountResponseSchema, ...standardErrors },
    },
};

export const updateAccountOptions = {
    schema: {
        tags: ["Finance"],
        summary: "Atualizar conta financeira",
        params: idParamsSchema,
        body: updateAccountBodySchema,
        response: { 200: singleAccountResponseSchema, ...standardErrors },
    },
};

export const listCategoriesOptions = {
    schema: {
        tags: ["Finance"],
        summary: "Listar categorias financeiras (com seed padrão na 1ª consulta)",
        response: { 200: categoriesListResponseSchema, ...standardErrors },
    },
};

export const createCategoryOptions = {
    schema: {
        tags: ["Finance"],
        summary: "Criar categoria financeira",
        body: createCategoryBodySchema,
        response: { 201: singleCategoryResponseSchema, ...standardErrors },
    },
};

export const updateCategoryOptions = {
    schema: {
        tags: ["Finance"],
        summary: "Atualizar categoria financeira",
        params: idParamsSchema,
        body: updateCategoryBodySchema,
        response: { 200: singleCategoryResponseSchema, ...standardErrors },
    },
};

export const listCostCentersOptions = {
    schema: {
        tags: ["Finance"],
        summary: "Listar centros de custo",
        response: { 200: costCentersListResponseSchema, ...standardErrors },
    },
};

export const createCostCenterOptions = {
    schema: {
        tags: ["Finance"],
        summary: "Criar centro de custo",
        body: createCostCenterBodySchema,
        response: { 201: singleCostCenterResponseSchema, ...standardErrors },
    },
};

export const updateCostCenterOptions = {
    schema: {
        tags: ["Finance"],
        summary: "Atualizar centro de custo",
        params: idParamsSchema,
        body: updateCostCenterBodySchema,
        response: { 200: singleCostCenterResponseSchema, ...standardErrors },
    },
};

export const listCounterpartiesOptions = {
    schema: {
        tags: ["Finance"],
        summary: "Listar clientes/fornecedores ativos disponíveis na empresa",
        querystring: listCounterpartiesQuerySchema,
        response: { 200: counterpartiesListResponseSchema, ...standardErrors },
    },
};

export const listEntriesOptions = {
    schema: {
        tags: ["Finance"],
        summary: "Listar títulos a pagar e a receber",
        querystring: listEntriesQuerySchema,
        response: { 200: entriesListResponseSchema, ...standardErrors },
    },
};

export const getEntryOptions = {
    schema: {
        tags: ["Finance"],
        summary: "Detalhar título financeiro e histórico de baixas",
        params: idParamsSchema,
        response: { 200: singleEntryResponseSchema, ...standardErrors },
    },
};

export const createEntryOptions = {
    schema: {
        tags: ["Finance"],
        summary: "Criar título a pagar/receber (único ou parcelado, idempotente)",
        body: createEntryBodySchema,
        response: {
            200: createdEntriesResponseSchema,
            201: createdEntriesResponseSchema,
            ...standardErrors,
        },
    },
};

export const createEntryFromServiceOptions = {
    schema: {
        tags: ["Finance"],
        summary: "Gerar título a receber a partir de um serviço (e NF opcional)",
        params: serviceIdParamsSchema,
        body: createEntryFromServiceBodySchema,
        response: {
            200: createdEntriesResponseSchema,
            201: createdEntriesResponseSchema,
            ...standardErrors,
        },
    },
};

export const updateEntryOptions = {
    schema: {
        tags: ["Finance"],
        summary: "Atualizar título financeiro",
        params: idParamsSchema,
        body: updateEntryBodySchema,
        response: { 200: singleEntryResponseSchema, ...standardErrors },
    },
};

export const cancelEntryOptions = {
    schema: {
        tags: ["Finance"],
        summary: "Cancelar título financeiro sem baixas ativas",
        params: idParamsSchema,
        body: cancelEntryBodySchema,
        response: { 200: singleEntryResponseSchema, ...standardErrors },
    },
};

export const settleEntryOptions = {
    schema: {
        tags: ["Finance"],
        summary: "Registrar baixa parcial ou total de título (append-only e idempotente)",
        params: idParamsSchema,
        body: settleEntryBodySchema,
        response: {
            200: settlementMutationResponseSchema,
            201: settlementMutationResponseSchema,
            ...standardErrors,
        },
    },
};

export const reverseSettlementOptions = {
    schema: {
        tags: ["Finance"],
        summary: "Estornar baixa financeira (append-only e idempotente)",
        params: idParamsSchema,
        body: reverseSettlementBodySchema,
        response: {
            200: settlementMutationResponseSchema,
            201: settlementMutationResponseSchema,
            ...standardErrors,
        },
    },
};

export const cashflowReportOptions = {
    schema: {
        tags: ["Finance"],
        summary: "Fluxo de caixa realizado e projetado (janela máx. 366 dias)",
        querystring: cashflowQuerySchema,
        response: { 200: cashflowResponseSchema, ...standardErrors },
    },
};

export const agingReportOptions = {
    schema: {
        tags: ["Finance"],
        summary: "Aging de vencimentos e taxa de inadimplência",
        querystring: agingQuerySchema,
        response: { 200: agingResponseSchema, ...standardErrors },
    },
};

export const exportReportOptions = {
    config: {
        rateLimit: rateLimitProfiles.sensitive,
    },
    schema: {
        tags: ["Finance"],
        summary: "Exportar títulos financeiros em CSV sanitizado (anti-formula injection)",
        querystring: exportReportQuerySchema,
        response: {
            400: errorResponseSchema,
            401: errorResponseSchema,
            403: errorResponseSchema,
            429: errorResponseSchema,
            500: errorResponseSchema,
        },
    },
};

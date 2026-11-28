import { FinanceDomainError } from "@/database/tables/finance/finance.repository";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { z } from "zod";
import type {
    agingQuerySchema,
    cancelEntryBodySchema,
    cashflowQuerySchema,
    createAccountBodySchema,
    createCategoryBodySchema,
    createCostCenterBodySchema,
    createEntryBodySchema,
    createEntryFromServiceBodySchema,
    exportReportQuerySchema,
    idParamsSchema,
    listCounterpartiesQuerySchema,
    listEntriesQuerySchema,
    reverseSettlementBodySchema,
    serviceIdParamsSchema,
    settleEntryBodySchema,
    updateAccountBodySchema,
    updateCategoryBodySchema,
    updateCostCenterBodySchema,
    updateEntryBodySchema,
} from "./finance.schemas";
import { FinanceUseCase, type TenantRequestContext } from "./finance.usecase";

const usecase = new FinanceUseCase();

function getTenantContext(request: FastifyRequest): TenantRequestContext {
    if (!request.tenant || !request.user?.id) {
        throw new FinanceDomainError(
            403,
            "TENANT_CONTEXT_MISSING",
            "Contexto de empresa não resolvido.",
        );
    }
    return {
        activeCompanyId: request.tenant.activeCompanyId,
        motherId: request.tenant.motherId,
        accessibleCompanyIds: request.tenant.accessibleCompanyIds,
        isConsolidated: request.tenant.isConsolidated,
        userId: request.user.id,
    };
}

function handleFinanceError(
    err: unknown,
    request: FastifyRequest,
    reply: FastifyReply,
) {
    if (err instanceof FinanceDomainError) {
        return reply.status(err.statusCode).send({
            message: err.message,
            error: err.code,
            statusCode: err.statusCode,
        });
    }
    request.log.error({ err }, "Unexpected error in finance module");
    return reply.status(500).send({
        message: "Internal server error",
        statusCode: 500,
    });
}

// ---------------- Accounts ----------------
export async function listAccountsController(
    request: FastifyRequest,
    reply: FastifyReply,
) {
    try {
        const result = await usecase.listAccounts(getTenantContext(request));
        return reply.status(200).send(result);
    } catch (err) {
        return handleFinanceError(err, request, reply);
    }
}

export async function createAccountController(
    request: FastifyRequest<{ Body: z.infer<typeof createAccountBodySchema> }>,
    reply: FastifyReply,
) {
    try {
        const result = await usecase.createAccount(
            getTenantContext(request),
            request.body,
        );
        return reply.status(201).send(result);
    } catch (err) {
        return handleFinanceError(err, request, reply);
    }
}

export async function updateAccountController(
    request: FastifyRequest<{
        Params: z.infer<typeof idParamsSchema>;
        Body: z.infer<typeof updateAccountBodySchema>;
    }>,
    reply: FastifyReply,
) {
    try {
        const result = await usecase.updateAccount(
            getTenantContext(request),
            request.params.id,
            request.body,
        );
        return reply.status(200).send(result);
    } catch (err) {
        return handleFinanceError(err, request, reply);
    }
}

// ---------------- Categories ----------------
export async function listCategoriesController(
    request: FastifyRequest,
    reply: FastifyReply,
) {
    try {
        const result = await usecase.listCategories(getTenantContext(request));
        return reply.status(200).send(result);
    } catch (err) {
        return handleFinanceError(err, request, reply);
    }
}

export async function createCategoryController(
    request: FastifyRequest<{ Body: z.infer<typeof createCategoryBodySchema> }>,
    reply: FastifyReply,
) {
    try {
        const result = await usecase.createCategory(
            getTenantContext(request),
            request.body,
        );
        return reply.status(201).send(result);
    } catch (err) {
        return handleFinanceError(err, request, reply);
    }
}

export async function updateCategoryController(
    request: FastifyRequest<{
        Params: z.infer<typeof idParamsSchema>;
        Body: z.infer<typeof updateCategoryBodySchema>;
    }>,
    reply: FastifyReply,
) {
    try {
        const result = await usecase.updateCategory(
            getTenantContext(request),
            request.params.id,
            request.body,
        );
        return reply.status(200).send(result);
    } catch (err) {
        return handleFinanceError(err, request, reply);
    }
}

// ---------------- Cost Centers ----------------
export async function listCostCentersController(
    request: FastifyRequest,
    reply: FastifyReply,
) {
    try {
        const result = await usecase.listCostCenters(getTenantContext(request));
        return reply.status(200).send(result);
    } catch (err) {
        return handleFinanceError(err, request, reply);
    }
}

export async function createCostCenterController(
    request: FastifyRequest<{ Body: z.infer<typeof createCostCenterBodySchema> }>,
    reply: FastifyReply,
) {
    try {
        const result = await usecase.createCostCenter(
            getTenantContext(request),
            request.body,
        );
        return reply.status(201).send(result);
    } catch (err) {
        return handleFinanceError(err, request, reply);
    }
}

export async function updateCostCenterController(
    request: FastifyRequest<{
        Params: z.infer<typeof idParamsSchema>;
        Body: z.infer<typeof updateCostCenterBodySchema>;
    }>,
    reply: FastifyReply,
) {
    try {
        const result = await usecase.updateCostCenter(
            getTenantContext(request),
            request.params.id,
            request.body,
        );
        return reply.status(200).send(result);
    } catch (err) {
        return handleFinanceError(err, request, reply);
    }
}

// ---------------- Counterparties ----------------
export async function listCounterpartiesController(
    request: FastifyRequest<{ Querystring: z.infer<typeof listCounterpartiesQuerySchema> }>,
    reply: FastifyReply,
) {
    try {
        const result = await usecase.listCounterparties(
            getTenantContext(request),
            request.query,
        );
        return reply.status(200).send(result);
    } catch (err) {
        return handleFinanceError(err, request, reply);
    }
}

// ---------------- Entries & Settlements ----------------
export async function listEntriesController(
    request: FastifyRequest<{ Querystring: z.infer<typeof listEntriesQuerySchema> }>,
    reply: FastifyReply,
) {
    try {
        const result = await usecase.listEntries(
            getTenantContext(request),
            request.query,
        );
        return reply.status(200).send(result);
    } catch (err) {
        return handleFinanceError(err, request, reply);
    }
}

export async function getEntryController(
    request: FastifyRequest<{ Params: z.infer<typeof idParamsSchema> }>,
    reply: FastifyReply,
) {
    try {
        const result = await usecase.getEntryById(
            getTenantContext(request),
            request.params.id,
        );
        return reply.status(200).send(result);
    } catch (err) {
        return handleFinanceError(err, request, reply);
    }
}

export async function createEntryController(
    request: FastifyRequest<{ Body: z.infer<typeof createEntryBodySchema> }>,
    reply: FastifyReply,
) {
    try {
        const result = await usecase.createEntries(
            getTenantContext(request),
            request.headers["idempotency-key"],
            request.body,
        );
        return reply.status(result.statusCode).send(result.payload);
    } catch (err) {
        return handleFinanceError(err, request, reply);
    }
}

export async function createEntryFromServiceController(
    request: FastifyRequest<{
        Params: z.infer<typeof serviceIdParamsSchema>;
        Body: z.infer<typeof createEntryFromServiceBodySchema>;
    }>,
    reply: FastifyReply,
) {
    try {
        const result = await usecase.createEntryFromService(
            getTenantContext(request),
            request.params.serviceId,
            request.headers["idempotency-key"],
            request.body,
        );
        return reply.status(result.statusCode).send(result.payload);
    } catch (err) {
        return handleFinanceError(err, request, reply);
    }
}

export async function updateEntryController(
    request: FastifyRequest<{
        Params: z.infer<typeof idParamsSchema>;
        Body: z.infer<typeof updateEntryBodySchema>;
    }>,
    reply: FastifyReply,
) {
    try {
        const result = await usecase.updateEntry(
            getTenantContext(request),
            request.params.id,
            request.body,
        );
        return reply.status(200).send(result);
    } catch (err) {
        return handleFinanceError(err, request, reply);
    }
}

export async function cancelEntryController(
    request: FastifyRequest<{
        Params: z.infer<typeof idParamsSchema>;
        Body: z.infer<typeof cancelEntryBodySchema>;
    }>,
    reply: FastifyReply,
) {
    try {
        const result = await usecase.cancelEntry(
            getTenantContext(request),
            request.params.id,
            request.body.reason,
        );
        return reply.status(200).send(result);
    } catch (err) {
        return handleFinanceError(err, request, reply);
    }
}

export async function settleEntryController(
    request: FastifyRequest<{
        Params: z.infer<typeof idParamsSchema>;
        Body: z.infer<typeof settleEntryBodySchema>;
    }>,
    reply: FastifyReply,
) {
    try {
        const result = await usecase.settleEntry(
            getTenantContext(request),
            request.params.id,
            request.headers["idempotency-key"],
            request.body,
        );
        return reply.status(result.statusCode).send(result.payload);
    } catch (err) {
        return handleFinanceError(err, request, reply);
    }
}

export async function reverseSettlementController(
    request: FastifyRequest<{
        Params: z.infer<typeof idParamsSchema>;
        Body: z.infer<typeof reverseSettlementBodySchema>;
    }>,
    reply: FastifyReply,
) {
    try {
        const result = await usecase.reverseSettlement(
            getTenantContext(request),
            request.params.id,
            request.headers["idempotency-key"],
            request.body,
        );
        return reply.status(result.statusCode).send(result.payload);
    } catch (err) {
        return handleFinanceError(err, request, reply);
    }
}

// ---------------- Reports & Export ----------------
export async function cashflowReportController(
    request: FastifyRequest<{ Querystring: z.infer<typeof cashflowQuerySchema> }>,
    reply: FastifyReply,
) {
    try {
        const result = await usecase.getCashflowReport(
            getTenantContext(request),
            request.query,
        );
        return reply.status(200).send(result);
    } catch (err) {
        return handleFinanceError(err, request, reply);
    }
}

export async function agingReportController(
    request: FastifyRequest<{ Querystring: z.infer<typeof agingQuerySchema> }>,
    reply: FastifyReply,
) {
    try {
        const result = await usecase.getAgingReport(
            getTenantContext(request),
            request.query,
        );
        return reply.status(200).send(result);
    } catch (err) {
        return handleFinanceError(err, request, reply);
    }
}

export async function exportReportController(
    request: FastifyRequest<{ Querystring: z.infer<typeof exportReportQuerySchema> }>,
    reply: FastifyReply,
) {
    try {
        const csv = await usecase.exportEntriesCsv(
            getTenantContext(request),
            request.query,
        );
        return reply
            .status(200)
            .header("Content-Type", "text/csv; charset=utf-8")
            .header(
                "Content-Disposition",
                'attachment; filename="financeiro-export.csv"',
            )
            .header("X-Content-Type-Options", "nosniff")
            .header("Cache-Control", "private, no-store")
            .send(csv);
    } catch (err) {
        return handleFinanceError(err, request, reply);
    }
}

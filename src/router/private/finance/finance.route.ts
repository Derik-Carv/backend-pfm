import { allRoles } from "@/lib/roles.list";
import { authMiddleware } from "@/middlewares/auth.middleware";
import { inspectRole } from "@/middlewares/role.middleware";
import type { FastifyInstance } from "fastify";
import {
    agingReportController,
    cancelEntryController,
    cashflowReportController,
    createAccountController,
    createCategoryController,
    createCostCenterController,
    createEntryController,
    createEntryFromServiceController,
    exportReportController,
    getEntryController,
    listAccountsController,
    listCategoriesController,
    listCostCentersController,
    listCounterpartiesController,
    listEntriesController,
    reverseSettlementController,
    settleEntryController,
    updateAccountController,
    updateCategoryController,
    updateCostCenterController,
    updateEntryController,
} from "./finance.controller";
import {
    agingReportOptions,
    cancelEntryOptions,
    cashflowReportOptions,
    createAccountOptions,
    createCategoryOptions,
    createCostCenterOptions,
    createEntryFromServiceOptions,
    createEntryOptions,
    exportReportOptions,
    getEntryOptions,
    listAccountsOptions,
    listCategoriesOptions,
    listCostCentersOptions,
    listCounterpartiesOptions,
    listEntriesOptions,
    reverseSettlementOptions,
    settleEntryOptions,
    updateAccountOptions,
    updateCategoryOptions,
    updateCostCenterOptions,
    updateEntryOptions,
} from "./finance.options";

export async function financeRoutes(app: FastifyInstance) {
    app.addHook("preHandler", authMiddleware);

    // Rotas de leitura: company_admin, finance, manager, observer (colaborator bloqueado!)
    app.register(async (readRoutes) => {
        readRoutes.addHook(
            "preHandler",
            inspectRole([
                allRoles.company_admin,
                allRoles.finance,
                allRoles.manager,
                allRoles.observer,
            ]),
        );

        readRoutes.get("/accounts", listAccountsOptions, listAccountsController);
        readRoutes.get("/categories", listCategoriesOptions, listCategoriesController);
        readRoutes.get(
            "/cost-centers",
            listCostCentersOptions,
            listCostCentersController,
        );
        readRoutes.get(
            "/counterparties",
            listCounterpartiesOptions,
            listCounterpartiesController,
        );
        readRoutes.get("/entries", listEntriesOptions, listEntriesController);
        readRoutes.get("/entries/:id", getEntryOptions, getEntryController);
        readRoutes.get(
            "/reports/cashflow",
            cashflowReportOptions,
            cashflowReportController,
        );
        readRoutes.get("/reports/aging", agingReportOptions, agingReportController);
    });

    // Rotas de escrita financeira e exportação: exclusivamente company_admin e finance
    app.register(async (writeRoutes) => {
        writeRoutes.addHook(
            "preHandler",
            inspectRole([allRoles.company_admin, allRoles.finance]),
        );

        writeRoutes.post("/accounts", createAccountOptions, createAccountController);
        writeRoutes.patch("/accounts/:id", updateAccountOptions, updateAccountController);

        writeRoutes.post(
            "/categories",
            createCategoryOptions,
            createCategoryController,
        );
        writeRoutes.patch(
            "/categories/:id",
            updateCategoryOptions,
            updateCategoryController,
        );

        writeRoutes.post(
            "/cost-centers",
            createCostCenterOptions,
            createCostCenterController,
        );
        writeRoutes.patch(
            "/cost-centers/:id",
            updateCostCenterOptions,
            updateCostCenterController,
        );

        writeRoutes.post("/entries", createEntryOptions, createEntryController);
        writeRoutes.post(
            "/entries/from-service/:serviceId",
            createEntryFromServiceOptions,
            createEntryFromServiceController,
        );
        writeRoutes.patch("/entries/:id", updateEntryOptions, updateEntryController);
        writeRoutes.post(
            "/entries/:id/cancel",
            cancelEntryOptions,
            cancelEntryController,
        );
        writeRoutes.post(
            "/entries/:id/settle",
            settleEntryOptions,
            settleEntryController,
        );
        writeRoutes.post(
            "/settlements/:id/reverse",
            reverseSettlementOptions,
            reverseSettlementController,
        );
        writeRoutes.get(
            "/reports/export",
            exportReportOptions,
            exportReportController,
        );
    });
}

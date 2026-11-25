import type { FastifyInstance } from "fastify";
import { authMiddleware } from "@/middlewares/auth.middleware";
import { inspectRole } from "@/middlewares/role.middleware";
import { allRoles } from "@/lib/roles.list";
import {
    createMotherCompanyOptions,
    updateMotherCompanyOptions,
    createBranchCompanyOptions,
    updateBranchCompanyOptions,
    listCompaniesOptions,
    listBranchesOptions,
    getMyCompaniesOptions,
    listCompanyUsersOptions,
    createCompanyUserOptions,
    updateCompanyUserOptions,
} from "./companies.options";
import {
    createMotherCompanyController,
    updateMotherCompanyController,
    createBranchCompanyController,
    updateBranchCompanyController,
    listMothersController,
    listBranchesController,
    getMyCompaniesController,
    listCompanyUsersController,
    createCompanyUserController,
    updateCompanyUserController,
} from "./companies.controller";

export async function companiesRoutes(app: FastifyInstance) {
    app.addHook("preHandler", authMiddleware);

    // Gestão Platform Admin (Exclusivo Admin SaaS)
    app.register(async (saasRoutes) => {
        saasRoutes.addHook("preHandler", inspectRole([allRoles.administrator]));
        saasRoutes.post("/mothers", createMotherCompanyOptions, createMotherCompanyController);
        saasRoutes.get("/mothers", listCompaniesOptions, listMothersController);
        saasRoutes.patch("/mothers/:id", updateMotherCompanyOptions, updateMotherCompanyController);
    });

    // Gestão Mother & Filiais + Equipe da Empresa (Exclusivo Admin da Empresa Cliente)
    app.register(async (companyAdminRoutes) => {
        companyAdminRoutes.addHook(
            "preHandler",
            inspectRole([allRoles.company_admin]),
        );
        companyAdminRoutes.post("/branches", createBranchCompanyOptions, createBranchCompanyController);
        companyAdminRoutes.patch("/branches/:id", updateBranchCompanyOptions, updateBranchCompanyController);

        companyAdminRoutes.get("/users", listCompanyUsersOptions, listCompanyUsersController);
        companyAdminRoutes.post("/users", createCompanyUserOptions, createCompanyUserController);
        companyAdminRoutes.patch("/users/:id", updateCompanyUserOptions, updateCompanyUserController);
    });

    // Consulta de filiais e contexto para usuários autenticados
    app.get(
        "/branches",
        {
            ...listBranchesOptions,
            preHandler: inspectRole([
                allRoles.administrator,
                allRoles.company_admin,
                allRoles.manager,
                allRoles.finance,
                allRoles.observer,
            ]),
        },
        listBranchesController,
    );

    // Alternância de Contexto / Meus Acessos para o Frontend
    app.get("/me", getMyCompaniesOptions, getMyCompaniesController);
}

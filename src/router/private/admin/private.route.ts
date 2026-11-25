import { type FastifyInstance } from "fastify";
import { authMiddleware } from "@/middlewares/auth.middleware";
import { inspectRole } from "@/middlewares/role.middleware";
import { allRoles } from "@/lib/roles.list";
import { adminDataRoutes } from "./data/adminData.route";
import { adminLgpdRoutes } from "./lgpd/adminLgpd.route";
import {
    getSystemMetricsOptions,
    getCascadeHierarchyOptions,
    getCompanyClientsOptions,
} from "./system/system.options";
import {
    getSystemMetricsController,
    getCascadeHierarchyController,
    getCompanyClientsController,
} from "./system/system.controller";
import {
    approveCompanyRequestOptions,
    listCompanyRequestsOptions,
    rejectCompanyRequestOptions,
} from "./companyRequests/adminCompanyRequests.options";
import {
    approveCompanyRequestController,
    listCompanyRequestsController,
    rejectCompanyRequestController,
} from "./companyRequests/adminCompanyRequests.controller";

export async function adminRoutes(app: FastifyInstance) {
    app.addHook("preHandler", authMiddleware);

    app.addHook("preHandler", inspectRole([allRoles.administrator]));

    // Rotas de Monitoramento e Gestão em Cascata da Plataforma
    app.get("/system/metrics", getSystemMetricsOptions, getSystemMetricsController);
    app.get("/system/hierarchy", getCascadeHierarchyOptions, getCascadeHierarchyController);
    app.get("/system/clients", getCompanyClientsOptions, getCompanyClientsController);

    // Fila de Solicitações de Cadastro de Empresas (Aprovação Admin SaaS)
    app.get("/company-requests", listCompanyRequestsOptions, listCompanyRequestsController);
    app.post("/company-requests/:id/approve", approveCompanyRequestOptions, approveCompanyRequestController);
    app.post("/company-requests/:id/reject", rejectCompanyRequestOptions, rejectCompanyRequestController);

    // Governança LGPD (Audit Logs e Limpeza de Retenção)
    app.register(adminLgpdRoutes, { prefix: "/lgpd" });

    // Gestão de tabelas brutas
    app.register(adminDataRoutes, { prefix: "/data" });
}

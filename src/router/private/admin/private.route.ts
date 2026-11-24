import { type FastifyInstance } from "fastify";
import { authMiddleware } from "@/middlewares/auth.middleware";
import { inspectRole } from "@/middlewares/role.middleware";
import { allRoles } from "@/lib/roles.list";
import { adminDataRoutes } from "./data/adminData.route";
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

export async function adminRoutes(app: FastifyInstance) {
    app.addHook("preHandler", authMiddleware);

    app.addHook("preHandler", inspectRole([allRoles.administrator]));

    // Rotas de Monitoramento e Gestão em Cascata da Plataforma
    app.get("/system/metrics", getSystemMetricsOptions, getSystemMetricsController);
    app.get("/system/hierarchy", getCascadeHierarchyOptions, getCascadeHierarchyController);
    app.get("/system/clients", getCompanyClientsOptions, getCompanyClientsController);

    // Gestão de tabelas brutas
    app.register(adminDataRoutes, { prefix: "/data" });
}

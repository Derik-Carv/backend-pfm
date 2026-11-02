import { type FastifyInstance } from "fastify";
import { authMiddleware } from "@/middlewares/auth.middleware";
import { inspectRole } from "@/middlewares/role.middleware";
import { allRoles } from "@/lib/roles.list";
import { getStatusServicesRouteOptions } from "@/router/private/manager/services/services.options";
import { getStatusServiceController } from "@/router/private/manager/services/status/getStatus.controller";
import { createServicesRouteOptions } from "@/router/private/manager/services/services.options";
import { createServicesController } from "@/router/private/manager/services/create/createServices.controller";

const serviceManagementRoles = [
    allRoles.administrator,
    allRoles.manager,
];

const statusReadRoles = [
    allRoles.administrator,
    allRoles.manager,
    allRoles.finance,
];

export async function managerRoutes(app: FastifyInstance) {
    app.addHook("preHandler", authMiddleware);

    app.register(async (serviceManagementRoutes) => {
        serviceManagementRoutes.addHook(
            "preHandler",
            inspectRole(serviceManagementRoles),
        );
        serviceManagementRoutes.post(
            "/services",
            createServicesRouteOptions,
            createServicesController,
        );
    });

    app.register(async (statusRoutes) => {
        statusRoutes.addHook("preHandler", inspectRole(statusReadRoles));
        statusRoutes.get(
            "/services/status",
            getStatusServicesRouteOptions,
            getStatusServiceController,
        );
    });
}

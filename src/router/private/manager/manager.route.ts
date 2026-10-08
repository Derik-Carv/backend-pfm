import { type FastifyInstance } from "fastify";
import { authMiddleware } from "@/middlewares/auth.middleware";
import { inspectRole } from "@/middlewares/role.middleware";
import { allRoles } from "@/lib/roles.list";
import {
    createClientRouteOptions,
    getClientRouteOptions,
} from "@/router/private/manager/client/client.options";
import { createClientController } from "@/router/private/manager/client/create/createClient.controller";
import { getClientsController } from "./client/get/getClient.controller";
import { getStatusServicesRouteOptions } from "@/router/private/manager/services/services.options";
import { getStatusServiceController } from "@/router/private/manager/services/status/getStatus.controller";
import { createServicesRouteOptions } from "@/router/private/manager/services/services.options";
import { createServicesController } from "@/router/private/manager/services/create/createServices.controller";

const allowedRoles = [allRoles.administrator, allRoles.manager];

export async function managerRoutes(app: FastifyInstance) {
    app.addHook("preHandler", authMiddleware);

    app.addHook("preHandler", inspectRole(allowedRoles));

    app.post("/clients", createClientRouteOptions, createClientController);

    app.get("/clients", getClientRouteOptions, getClientsController);

    app.get(
        "/services/status",
        getStatusServicesRouteOptions,
        getStatusServiceController,
    );

    app.post("/services", createServicesRouteOptions, createServicesController);
}

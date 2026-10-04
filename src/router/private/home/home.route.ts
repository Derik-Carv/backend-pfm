import { type FastifyInstance } from "fastify";
import { authMiddleware } from "@/middlewares/auth.middleware";
import { inspectRole } from "@/middlewares/role.middleware";
import { allRoles } from "@/lib/roles.list";
import { getServicesHomeRouteOptions } from "./services/services.options";
import { getServicesController } from "./services/get/getServices.controller";
import { getServicesHomeController } from "./services/dash/dashServiceHome.controller";

const allowedRoles = Object.values(allRoles);

export async function homeRoutes(app: FastifyInstance) {
    app.addHook("preHandler", authMiddleware);

    app.addHook("preHandler", inspectRole(allowedRoles));

    app.get("/services", getServicesHomeRouteOptions, getServicesController);

    app.get(
        "/services/index",
        getServicesHomeRouteOptions,
        getServicesHomeController,
    );
}

import { type FastifyInstance } from "fastify";
import { authMiddleware } from "@/middlewares/auth.middleware";
import { inspectRole } from "@/middlewares/role.middleware";
import { allRoles } from "@/lib/roles.list";
import { getServicesRouteOptions } from "./services/services.options";
import { getServicesController } from "./services/get/getServices.controller";

const allowedRoles = Object.values(allRoles);

export async function homeRoutes(app: FastifyInstance) {
    app.addHook("preHandler", authMiddleware);

    app.addHook("preHandler", inspectRole(allowedRoles));

    app.get("/services", getServicesRouteOptions, getServicesController);
}

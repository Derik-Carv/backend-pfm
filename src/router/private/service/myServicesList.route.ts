import { type FastifyInstance } from "fastify";
import { authMiddleware } from "@/middlewares/auth.middleware";
import { inspectRole } from "@/middlewares/role.middleware";
import { allRoles } from "@/lib/roles.list";
import {
    createServicesRouteOptions,
    editServicesRouteOptions,
    getMyServicesListRouteOptions,
} from "./myServicesList.options";
import { getMyServicesListController } from "./listService/myServicesList.controller";
import { createServicesController } from "./newService/createServices.controller";
import { editServicesController } from "./patchService/editService.controller";

const allowedRoles = Object.values(allRoles);

export async function managerServicesRoutes(app: FastifyInstance) {
    app.addHook("preHandler", authMiddleware);

    app.addHook("preHandler", inspectRole(allowedRoles));

    app.get(
        "/list",
        getMyServicesListRouteOptions,
        getMyServicesListController,
    );

    app.post("/create", createServicesRouteOptions, createServicesController);

    app.patch("/:id", editServicesRouteOptions, editServicesController);
}

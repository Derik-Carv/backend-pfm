import type { FastifyInstance } from "fastify";
import { authMiddleware } from "@/middlewares/auth.middleware";
import { inspectRole } from "@/middlewares/role.middleware";
import { allRoles } from "@/lib/roles.list";
import {
    createTypeRouteOptions,
    deactivateTypeRouteOptions,
    getTypesRouteOptions,
} from "./type.options";
import {
    createTypeController,
    deactivateTypeController,
    getTypesController,
} from "./get/getType.controller";

export async function typeRoutes(app: FastifyInstance) {
    app.addHook("preHandler", authMiddleware);
    app.addHook(
        "preHandler",
        inspectRole([allRoles.administrator, allRoles.manager, allRoles.finance]),
    );
    app.get("/", getTypesRouteOptions, getTypesController);
    app.post("/", createTypeRouteOptions, createTypeController);
    app.patch("/:id/deactivate", deactivateTypeRouteOptions, deactivateTypeController);
}

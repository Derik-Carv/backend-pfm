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

    app.get(
        "/",
        {
            ...getTypesRouteOptions,
            preHandler: [
                inspectRole([
                    allRoles.administrator,
                    allRoles.company_admin,
                    allRoles.manager,
                    allRoles.finance,
                    allRoles.observer,
                ]),
            ],
        },
        getTypesController,
    );
    app.post(
        "/",
        {
            ...createTypeRouteOptions,
            preHandler: [inspectRole([allRoles.administrator])],
        },
        createTypeController,
    );
    app.patch(
        "/:id/deactivate",
        {
            ...deactivateTypeRouteOptions,
            preHandler: [inspectRole([allRoles.administrator])],
        },
        deactivateTypeController,
    );
}

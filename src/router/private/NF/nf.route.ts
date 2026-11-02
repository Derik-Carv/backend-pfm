import { type FastifyInstance } from "fastify";
import { authMiddleware } from "@/middlewares/auth.middleware";
import { inspectRole } from "@/middlewares/role.middleware";
import { allRoles } from "@/lib/roles.list";
import { createNfServicesController } from "./create/createNf.controller";
import { createNfRouteOptions } from "./nf.options";
import {
    activateNfRouteOptions,
    deactivateNfRouteOptions,
    listNfRouteOptions,
} from "./nf.options";
import { listNfController } from "./list/listNf.controller";
import { deactivateNfController } from "./deactivate/deactivateNf.controller";
import { activateNfController } from "./activate/activateNf.controller";
import { getNfFileController } from "./file/getNfFile.controller";
import { replaceNfFileController } from "./file/replaceNfFile.controller";

const allowedRolesFinance = [allRoles.administrator, allRoles.finance];

const allowedRolesManager = [
    allRoles.administrator,
    allRoles.manager,
    allRoles.finance,
];

export async function nfServicesRoutes(app: FastifyInstance) {
    app.addHook("preHandler", authMiddleware);

    app.addHook("preHandler", inspectRole(allowedRolesFinance));

    app.post("/", createNfRouteOptions, createNfServicesController);
}

export async function nfQueryRoutes(app: FastifyInstance) {
    app.addHook("preHandler", authMiddleware);
    app.addHook("preHandler", inspectRole(allowedRolesManager));

    app.get("/", listNfRouteOptions, listNfController);
    app.get("/:id/file", getNfFileController);
    app.post("/:id/file", replaceNfFileController);
    app.patch(
        "/:id/activate",
        activateNfRouteOptions,
        activateNfController,
    );
    app.patch(
        "/:id/deactivate",
        deactivateNfRouteOptions,
        deactivateNfController,
    );
}

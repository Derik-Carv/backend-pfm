import type { FastifyInstance } from "fastify";
import { authMiddleware } from "@/middlewares/auth.middleware";
import { inspectRole } from "@/middlewares/role.middleware";
import { allRoles } from "@/lib/roles.list";
import {
    createMovimentationRouteOptions,
    deactivateMovimentationRouteOptions,
    listMovimentationRouteOptions,
} from "./movimentation.options";
import {
    createMovimentationController,
    deactivateMovimentationController,
    listMovimentationsController,
} from "./movimentation.controller";

const allowedRoles = [
    allRoles.administrator,
    allRoles.manager,
    allRoles.finance,
];

export async function movimentationRoutes(app: FastifyInstance) {
    app.addHook("preHandler", authMiddleware);
    app.addHook("preHandler", inspectRole(allowedRoles));
    app.get("/", listMovimentationRouteOptions, listMovimentationsController);
    app.post("/", createMovimentationRouteOptions, createMovimentationController);
    app.patch(
        "/:id/deactivate",
        deactivateMovimentationRouteOptions,
        deactivateMovimentationController,
    );
}

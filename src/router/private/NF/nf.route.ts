import { type FastifyInstance } from "fastify";
import { authMiddleware } from "@/middlewares/auth.middleware";
import { inspectRole } from "@/middlewares/role.middleware";
import { allRoles } from "@/lib/roles.list";
import { createNfServicesController } from "./create/createNf.controller";
import { createNfRouteOptions } from "./nf.options";

const allowedRoles = [
    allRoles.administrator,
    allRoles.manager,
    allRoles.finance,
];

export async function nfServicesRoutes(app: FastifyInstance) {
    app.addHook("preHandler", authMiddleware);

    app.addHook("preHandler", inspectRole(allowedRoles));

    app.post("/", createNfRouteOptions, createNfServicesController);
}

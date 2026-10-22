import { type FastifyInstance } from "fastify";
import { authMiddleware } from "@/middlewares/auth.middleware";
import { inspectRole } from "@/middlewares/role.middleware";
import { allRoles } from "@/lib/roles.list";
import {
    createClientRouteOptions,
    editClientRouteOptions,
    getClientRouteOptions,
} from "./client.options";
import { getClientsController } from "./get/getClient.controller";
import { createClientController } from "./create/createClient.controller";
import { editClientController } from "./patch/editClient.controller";

const allowedRoles = [
    allRoles.administrator,
    allRoles.manager,
    allRoles.finance,
    allRoles.colaborator,
];

export async function menuClientRoutes(app: FastifyInstance) {
    app.addHook("preHandler", authMiddleware);

    app.addHook("preHandler", inspectRole(allowedRoles));

    app.get("/", getClientRouteOptions, getClientsController);

    app.post("/", createClientRouteOptions, createClientController);

    app.patch("/", editClientRouteOptions, editClientController);
}

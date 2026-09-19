import { getUserController } from "@/router/public/createuser/get/getUser.controller";
import { getUserRouteOptions } from "@/router/public/createuser/user.options";
import { type FastifyInstance } from "fastify";
import {
    createRoleRouteOptions,
    getRoleRouteOptions,
} from "@/router/private/admin/role/role.options";
import { createRoleController } from "@/router/private/admin/role/create/createRole.controller";
import { getRolesController } from "@/router/private/admin/role/get/getRole.controller";
import { authMiddleware } from "@/middlewares/auth.middleware";
import { inspectRole } from "@/middlewares/role.middleware";
import { allRoles } from "@/lib/roles.list";

export async function adminRoutes(app: FastifyInstance) {
    app.addHook("preHandler", authMiddleware);

    app.addHook("preHandler", inspectRole(allRoles.administrator));

    app.get("/users", getUserRouteOptions, getUserController);

    app.post("/roles", createRoleRouteOptions, createRoleController);

    app.get("/roles", getRoleRouteOptions, getRolesController);
}

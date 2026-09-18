import { type FastifyInstance } from "fastify";
import { healthRouteOptions } from "@/router/public/health/health.options";
import { healthController } from "@/router/public/health/health.controller";
import { loginController } from "@/router/public/login/login.controller";
import { loginRouteOptions } from "@/router/public/login/login.options";
import {
    createUserRouteOptions,
    getUserRouteOptions,
} from "@/router/public/createuser/user.options";
import { createUserController } from "@/router/public/createuser/create/createUser.controller";
import {
    createRoleRouteOptions,
    getRoleRouteOptions,
} from "@/router/private/admin/role/role.options";
import { createRoleController } from "@/router/private/admin/role/create/createRole.controller";
import { getRolesController } from "@/router/private/admin/role/get/getRole.controller";
import { getUserController } from "@/router/public/createuser/get/getUser.controller";

export async function publicRoutes(app: FastifyInstance) {
    app.post("/login", loginRouteOptions, loginController);

    app.post("/register", createUserRouteOptions, createUserController);

    app.get("/users", getUserRouteOptions, getUserController);

    app.get("/health", healthRouteOptions, healthController);

    app.post("/roles", createRoleRouteOptions, createRoleController);

    app.get("/roles", getRoleRouteOptions, getRolesController);
}

import type { FastifyInstance } from "fastify";
import { healthRouteOptions } from "@/router/public/health/health.options";
import { healthController } from "./health/health.controller";
import { loginController } from "./login/login.controller";
import { loginRouteOptions } from "./login/login.options";
import {
    createUserRouteOptions,
    getUserRouteOptions,
} from "./createuser/user.options";
import { createUserController } from "./createuser/createUser.controller";
import {
    createRoleRouteOptions,
    getRoleRouteOptions,
} from "../private/admin/role/role.options";
import { createRoleController } from "../private/admin/role/createRole.controller";
import { getRolesController } from "../private/admin/role/getRole.controller";
import { getUserController } from "./createuser/getUser.controller";

export async function publicRoutes(app: FastifyInstance) {
    app.post("/login", loginRouteOptions, loginController);

    app.post("/register", createUserRouteOptions, createUserController);

    app.get("/users", getUserRouteOptions, getUserController);

    app.get("/health", healthRouteOptions, healthController);

    app.post("/roles", createRoleRouteOptions, createRoleController);

    app.get("/roles", getRoleRouteOptions, getRolesController);
}

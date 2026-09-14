import type { FastifyInstance } from "fastify";
import { healthRouteOptions } from "@/router/public/health/health.options";
import { healthController } from "./health/health.controller";
import { loginController } from "./login/login.controller";
import { loginRouteOptions } from "./login/login.options";
import { createUserRouteOptions } from "./createuser/createUser.options";
import { createUserController } from "./createuser/createUser.controller";

export async function publicRoutes(app: FastifyInstance) {
    app.post("/login", loginRouteOptions, loginController);

    app.post("/register", createUserRouteOptions, createUserController);

    app.get("/health", healthRouteOptions, healthController);
}

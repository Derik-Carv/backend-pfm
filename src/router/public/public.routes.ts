import { type FastifyInstance } from "fastify";
import { healthRouteOptions } from "@/router/public/health/health.options";
import { healthController } from "@/router/public/health/health.controller";
import { loginController } from "@/router/public/login/login.controller";
import { loginRouteOptions } from "@/router/public/login/login.options";
import { createUserRouteOptions } from "@/router/public/createuser/user.options";
import { createUserController } from "@/router/public/createuser/create/createUser.controller";

export async function publicRoutes(app: FastifyInstance) {
    app.post("/login", loginRouteOptions, loginController);

    app.post("/register", createUserRouteOptions, createUserController);

    app.get("/health", healthRouteOptions, healthController);
}

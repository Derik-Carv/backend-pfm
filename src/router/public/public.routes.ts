import { type FastifyInstance } from "fastify";
import { healthRouteOptions } from "@/router/public/health/health.options";
import { healthController } from "@/router/public/health/health.controller";
import { loginController } from "@/router/public/login/login.controller";
import { loginRouteOptions } from "@/router/public/login/login.options";
import {
    createCompanyRequestOptions,
    requestCompanyCodeOptions,
} from "@/router/public/companyRequests/companyRequests.options";
import {
    createCompanyRequestController,
    requestCompanyCodeController,
} from "@/router/public/companyRequests/companyRequests.controller";
import {
    forgotPasswordRouteOptions,
    resetPasswordRouteOptions,
} from "@/router/public/password/password.options";
import {
    forgotPasswordController,
    resetPasswordController,
} from "@/router/public/password/password.controller";

export async function publicRoutes(app: FastifyInstance) {
    app.post("/login", loginRouteOptions, loginController);

    app.post(
        "/company-requests/request-code",
        requestCompanyCodeOptions,
        requestCompanyCodeController,
    );

    app.post(
        "/company-requests",
        createCompanyRequestOptions,
        createCompanyRequestController,
    );

    app.post(
        "/password/forgot",
        forgotPasswordRouteOptions,
        forgotPasswordController,
    );

    app.post(
        "/password/reset",
        resetPasswordRouteOptions,
        resetPasswordController,
    );

    app.get("/health", healthRouteOptions, healthController);
}

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
import { getLegalMetadata } from "@/lib/lgpd/legal.constants";
import { z } from "zod";

const legalMetadataResponseSchema = z.object({
    termsVersion: z.string(),
    privacyVersion: z.string(),
    dpo: z.object({
        name: z.string(),
        email: z.string(),
    }),
    fiscalRetentionYears: z.number(),
    otpRetentionHours: z.number(),
    rejectedRequestRetentionDays: z.number(),
    subprocessors: z.array(
        z.object({
            name: z.string(),
            purpose: z.string(),
        }),
    ),
});

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

    app.get(
        "/legal",
        {
            schema: {
                tags: ["Public", "LGPD"],
                summary: "Get current LGPD legal document versions and DPO contact",
                response: {
                    200: legalMetadataResponseSchema,
                },
            },
        },
        async (_request, reply) => {
            return reply.status(200).send(getLegalMetadata());
        },
    );
}

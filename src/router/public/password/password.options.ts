import { rateLimitProfiles } from "@/policies/rateLimit";
import { errorResponseSchema } from "@/router/error.schema";
import {
    forgotPasswordResponseSchema,
    forgotPasswordSchema,
    resetPasswordResponseSchema,
    resetPasswordSchema,
} from "./password.schemas";

export const forgotPasswordRouteOptions = {
    config: {
        rateLimit: rateLimitProfiles.default,
    },
    schema: {
        tags: ["Auth", "Password"],
        summary: "Request password reset verification code via email",
        body: forgotPasswordSchema,
        response: {
            200: forgotPasswordResponseSchema,
            400: errorResponseSchema,
            500: errorResponseSchema,
        },
    },
};

export const resetPasswordRouteOptions = {
    config: {
        rateLimit: rateLimitProfiles.default,
    },
    schema: {
        tags: ["Auth", "Password"],
        summary: "Reset password using 6-digit email verification code",
        body: resetPasswordSchema,
        response: {
            200: resetPasswordResponseSchema,
            400: errorResponseSchema,
            500: errorResponseSchema,
        },
    },
};

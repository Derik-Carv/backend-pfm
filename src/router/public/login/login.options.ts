import { rateLimitProfiles } from "@/policies/rateLimit";
import {
    loginSchema,
    loginResponseOkSchema,
} from "@/router/public/login/login.schemas";
import { errorResponseSchema } from "../../error.schema";

export const loginRouteOptions = {
    config: {
        rateLimit: rateLimitProfiles.standard,
    },
    schema: {
        tags: ["Login"],
        summary: "Login with user",
        description: "Route for login authentication",
        body: loginSchema,
        response: {
            200: loginResponseOkSchema,
            400: errorResponseSchema,
            401: errorResponseSchema,
            404: errorResponseSchema,
            500: errorResponseSchema,
        },
    },
};

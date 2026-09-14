import { rateLimitProfiles } from "@/policies/rateLimit";
import {
    createUserSchema,
    createUserResponseSchema,
} from "@/router/public/createuser/createUser.schemas";
import { errorResponseSchema } from "../error.schema";

export const createUserRouteOptions = {
    config: {
        rateLimit: rateLimitProfiles.standard,
    },
    schema: {
        tags: ["Auth"],
        summary: "Register new user",
        description:
            "Creates a new user account with validated fields and unique constraints",
        body: createUserSchema,
        response: {
            201: createUserResponseSchema,
            400: errorResponseSchema,
            409: errorResponseSchema,
            500: errorResponseSchema,
        },
    },
};

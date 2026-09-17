import { rateLimitProfiles } from "@/policies/rateLimit";
import {
    createUserSchema,
    createUserResponseSchema,
    getUserResponseSchema,
} from "@/router/public/createuser/user.schemas";
import { errorResponseSchema } from "../../error.schema";

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
            404: errorResponseSchema,
            409: errorResponseSchema,
            500: errorResponseSchema,
        },
    },
};

export const getUserRouteOptions = {
    config: {
        rateLimit: rateLimitProfiles.standard,
    },
    schema: {
        tags: ["Auth"],
        summary: "Find all usersr",
        description: "Find all users in system",
        response: {
            201: getUserResponseSchema,
            400: errorResponseSchema,
            404: errorResponseSchema,
            409: errorResponseSchema,
            500: errorResponseSchema,
        },
    },
};

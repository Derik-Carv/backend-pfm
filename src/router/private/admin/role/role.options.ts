import { rateLimitProfiles } from "@/policies/rateLimit";
import { errorResponseSchema } from "@/router/error.schema";
import {
    createRoleResponseSchema,
    createRoleSchema,
    getRolesResponseSchema,
} from "./role.schemas";

export const createRoleRouteOptions = {
    config: {
        rateLimit: rateLimitProfiles.manager,
    },
    schema: {
        tags: ["Role"],
        summary: "Register new role",
        description: "Creates a new role for system access.",
        body: createRoleSchema,
        response: {
            201: createRoleResponseSchema,
            400: errorResponseSchema,
            404: errorResponseSchema,
            409: errorResponseSchema,
            500: errorResponseSchema,
        },
    },
};

export const getRoleRouteOptions = {
    config: {
        rateLimit: rateLimitProfiles.manager,
    },
    schema: {
        tags: ["Role"],
        summary: "Get all roles",
        description: "List all roles in system",
        response: {
            200: getRolesResponseSchema,
            400: errorResponseSchema,
            404: errorResponseSchema,
            409: errorResponseSchema,
            500: errorResponseSchema,
        },
    },
};

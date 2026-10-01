import { rateLimitProfiles } from "@/policies/rateLimit";
import { errorResponseSchema } from "@/router/error.schema";
import {
    createClientResponseSchema,
    createClientSchema,
    getClientsResponseSchema,
} from "@/router/private/manager/client/client.schemas";

export const createClientRouteOptions = {
    config: {
        rateLimit: rateLimitProfiles.manager,
    },
    schema: {
        tags: ["Client"],
        summary: "Register a new client",
        description: "Creates a new clients for system access.",
        body: createClientSchema,
        response: {
            201: createClientResponseSchema,
            400: errorResponseSchema,
            404: errorResponseSchema,
            409: errorResponseSchema,
            500: errorResponseSchema,
        },
    },
};

export const getClientRouteOptions = {
    config: {
        rateLimit: rateLimitProfiles.manager,
    },
    schema: {
        tags: ["Client"],
        summary: "Get all clients",
        description: "List all clients in system",
        response: {
            200: getClientsResponseSchema,
            400: errorResponseSchema,
            404: errorResponseSchema,
            409: errorResponseSchema,
            500: errorResponseSchema,
        },
    },
};

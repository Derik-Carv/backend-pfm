import { rateLimitProfiles } from "@/policies/rateLimit";
import { errorResponseSchema } from "@/router/error.schema";
import { paginationQuerySchema } from "@/router/pagination.schema";
import {
    createClientResponseSchema,
    createClientSchema,
    editClientSchema,
    editClientsResponseSchema,
    getClientsResponseSchema,
} from "./client.schemas";

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
        description: "List clients with pagination",
        querystring: paginationQuerySchema,
        response: {
            200: getClientsResponseSchema,
            400: errorResponseSchema,
            500: errorResponseSchema,
        },
    },
};

export const editClientRouteOptions = {
    config: {
        rateLimit: rateLimitProfiles.manager,
    },
    schema: {
        tags: ["Client"],
        summary: "Edit a client",
        description: "Edit a client.",
        body: editClientSchema,
        response: {
            200: editClientsResponseSchema,
            400: errorResponseSchema,
            404: errorResponseSchema,
            409: errorResponseSchema,
            500: errorResponseSchema,
        },
    },
};

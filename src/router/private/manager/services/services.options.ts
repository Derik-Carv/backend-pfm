import { rateLimitProfiles } from "@/policies/rateLimit";
import { errorResponseSchema } from "@/router/error.schema";
import {
    getServiceResponseSchema,
    getStatusResponseSchema,
    createServiceInputSchema,
} from "@/router/private/manager/services/services.schemas";

export const getServicesHomeRouteOptions = {
    config: {
        rateLimit: rateLimitProfiles.standard,
    },
    schema: {
        tags: ["Services"],
        summary: "Get all services",
        description: "Returns a list of all services",
        response: {
            200: getServiceResponseSchema,
            400: errorResponseSchema,
            404: errorResponseSchema,
            409: errorResponseSchema,
            500: errorResponseSchema,
        },
    },
};

export const createServicesRouteOptions = {
    config: {
        rateLimit: rateLimitProfiles.standard,
    },
    schema: {
        tags: ["Services"],
        body: createServiceInputSchema,
        summary: "Create a new service",
        description: "Returns the created service with all its details",
        response: {
            201: getServiceResponseSchema,
            400: errorResponseSchema,
            404: errorResponseSchema,
            409: errorResponseSchema,
            500: errorResponseSchema,
        },
    },
};

export const getStatusServicesRouteOptions = {
    config: {
        rateLimit: rateLimitProfiles.standard,
    },
    schema: {
        tags: ["Status Services"],
        summary: "Get all active status services",
        description: "Returns a list of all active status services",
        response: {
            200: getStatusResponseSchema,
            400: errorResponseSchema,
            404: errorResponseSchema,
            409: errorResponseSchema,
            500: errorResponseSchema,
        },
    },
};

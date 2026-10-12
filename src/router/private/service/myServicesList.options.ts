import { rateLimitProfiles } from "@/policies/rateLimit";
import { errorResponseSchema } from "@/router/error.schema";
import {
    getMyServicesListResponseSchema,
    serviceCreateBaseSchema,
    getServicesCreateResponseSchema,
    serviceEditBaseSchema,
    serviceEditResponseSchema,
} from "./myServicesList.schemas";

export const getMyServicesListRouteOptions = {
    config: {
        rateLimit: rateLimitProfiles.standard,
    },
    schema: {
        tags: ["Services Menu"],
        summary: "Menu my services",
        description: "List services",
        response: {
            200: getMyServicesListResponseSchema,
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
        tags: ["Services Menu"],
        body: serviceCreateBaseSchema,
        summary: "Create a new service",
        description: "Returns the created service with all its details",
        response: {
            201: getServicesCreateResponseSchema,
            400: errorResponseSchema,
            404: errorResponseSchema,
            409: errorResponseSchema,
            500: errorResponseSchema,
        },
    },
};

export const editServicesRouteOptions = {
    config: {
        rateLimit: rateLimitProfiles.standard,
    },
    schema: {
        tags: ["Services Menu"],
        body: serviceEditBaseSchema,
        summary: "Edit a service",
        description: "Returns the edited service with all its details",
        response: {
            201: serviceEditResponseSchema,
            400: errorResponseSchema,
            404: errorResponseSchema,
            409: errorResponseSchema,
            500: errorResponseSchema,
        },
    },
};

import { rateLimitProfiles } from "@/policies/rateLimit";
import { errorResponseSchema } from "@/router/error.schema";
import {
    getMenuOverviewResponseSchema,
    getMyServicesFinderResponseSchema,
    getMyServicesResponseSchema,
    getServicesQuerySchema,
    getServicesFinderParamsSchema,
} from "@/router/private/home/services/services.schemas";

export const getServicesHomeRouteOptions = {
    config: {
        rateLimit: rateLimitProfiles.standard,
    },
    schema: {
        tags: ["Dashboard", "Services"],
        summary: "Find home services overview",
        description:
            "Returns top 3 services categorized by high value, recent, and oldest",
        response: {
            200: getMenuOverviewResponseSchema,
            400: errorResponseSchema,
            404: errorResponseSchema,
            409: errorResponseSchema,
            500: errorResponseSchema,
        },
    },
};

export const getServicesFinderHomeRouteOptions = {
    config: {
        rateLimit: rateLimitProfiles.standard,
    },
    schema: {
        tags: ["Dashboard", "Services"],
        summary: "Find home services overview",
        description: "Returns services with finded",
        params: getServicesFinderParamsSchema,
        querystring: getServicesQuerySchema,
        response: {
            200: getMyServicesFinderResponseSchema,
            400: errorResponseSchema,
            404: errorResponseSchema,
            409: errorResponseSchema,
            500: errorResponseSchema,
        },
    },
};

export const getServicesRouteOptions = {
    config: {
        rateLimit: rateLimitProfiles.standard,
    },
    schema: {
        tags: ["Dashboard", "Services"],
        summary: "Find home services overview",
        description: "Returns services with finded",
        querystring: getServicesQuerySchema,
        response: {
            200: getMyServicesResponseSchema,
            400: errorResponseSchema,
            404: errorResponseSchema,
            409: errorResponseSchema,
            500: errorResponseSchema,
        },
    },
};

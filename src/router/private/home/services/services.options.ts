import { rateLimitProfiles } from "@/policies/rateLimit";
import { errorResponseSchema } from "@/router/error.schema";
import { getServicesResponseSchema } from "@/router/private/home/services/services.schemas";

export const getServicesRouteOptions = {
    config: {
        rateLimit: rateLimitProfiles.standard,
    },
    schema: {
        tags: ["Services"],
        summary: "Find all services",
        description: "Find all services in system",
        response: {
            201: getServicesResponseSchema,
            400: errorResponseSchema,
            404: errorResponseSchema,
            409: errorResponseSchema,
            500: errorResponseSchema,
        },
    },
};

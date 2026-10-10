import { rateLimitProfiles } from "@/policies/rateLimit";
import { errorResponseSchema } from "@/router/error.schema";
import { getAllServicesResponseSchema } from "./services.schemas";

export const getAllServicesAdminRouteOptions = {
    config: {
        rateLimit: rateLimitProfiles.standard,
    },
    schema: {
        tags: ["Admin", "Services"],
        summary: "Find all services",
        description: "Returns all services",
        response: {
            200: getAllServicesResponseSchema,
            400: errorResponseSchema,
            404: errorResponseSchema,
            409: errorResponseSchema,
            500: errorResponseSchema,
        },
    },
};

import { rateLimitProfiles } from "@/policies/rateLimit";
import { errorResponseSchema } from "@/router/error.schema";
import { getMyServicesListResponseSchema } from "./myServicesList.schemas";

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

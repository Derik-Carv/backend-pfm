import { rateLimitProfiles } from "@/policies/rateLimit";
import { errorResponseSchema } from "@/router/error.schema";
import { getMenuOverviewResponseSchema } from "@/router/private/home/services/services.schemas";

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

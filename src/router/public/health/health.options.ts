import { rateLimitProfiles } from "@/policies/rateLimit";
import { healthOkResponse } from "@/router/public/health/health.schemas";
import { errorResponseSchema } from "../error.schema";

export const healthRouteOptions = {
    config: {
        rateLimit: rateLimitProfiles.standard,
    },
    schema: {
        description: "Check server status health",
        tags: ["Public"],
        response: {
            200: healthOkResponse,
            401: errorResponseSchema,
            404: errorResponseSchema,
            500: errorResponseSchema,
        },
    },
};

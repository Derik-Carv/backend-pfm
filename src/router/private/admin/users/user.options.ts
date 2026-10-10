import { rateLimitProfiles } from "@/policies/rateLimit";
import { getUserResponseSchema } from "@/router/private/admin/users/user.schemas";
import { errorResponseSchema } from "@/router/error.schema";

export const getUserRouteOptions = {
    config: {
        rateLimit: rateLimitProfiles.standard,
    },
    schema: {
        tags: ["Users"],
        summary: "Find all usersr",
        description: "Find all users in system",
        response: {
            200: getUserResponseSchema,
            400: errorResponseSchema,
            404: errorResponseSchema,
            409: errorResponseSchema,
            500: errorResponseSchema,
        },
    },
};

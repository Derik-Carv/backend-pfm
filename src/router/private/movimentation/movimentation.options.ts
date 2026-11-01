import { rateLimitProfiles } from "@/policies/rateLimit";
import { errorResponseSchema } from "@/router/error.schema";
import {
    createMovimentationSchema,
    movimentationIdParamsSchema,
    movimentationListResponseSchema,
    movimentationResponseSchema,
} from "./movimentation.schemas";

const common = {
    config: { rateLimit: rateLimitProfiles.standard },
    schema: { tags: ["Movimentation"] },
};

export const listMovimentationRouteOptions = {
    ...common,
    schema: {
        ...common.schema,
        summary: "List active movimentations",
        response: { 200: movimentationListResponseSchema, 500: errorResponseSchema },
    },
};

export const createMovimentationRouteOptions = {
    ...common,
    schema: {
        ...common.schema,
        summary: "Create a movimentation",
        body: createMovimentationSchema,
        response: {
            201: movimentationResponseSchema,
            400: errorResponseSchema,
            404: errorResponseSchema,
            409: errorResponseSchema,
            500: errorResponseSchema,
        },
    },
};

export const deactivateMovimentationRouteOptions = {
    ...common,
    schema: {
        ...common.schema,
        summary: "Deactivate a movimentation",
        params: movimentationIdParamsSchema,
        response: {
            200: movimentationResponseSchema,
            400: errorResponseSchema,
            404: errorResponseSchema,
            500: errorResponseSchema,
        },
    },
};

import { rateLimitProfiles } from "@/policies/rateLimit";
import { errorResponseSchema } from "@/router/error.schema";
import {
    createTypeSchema,
    getTypesResponseSchema,
    typeIdParamsSchema,
    typeResponseSchema,
} from "./type.schemas";

export const getTypesRouteOptions = {
    config: {
        rateLimit: rateLimitProfiles.standard,
    },
    schema: {
        tags: ["NF Menu"],
        summary: "List fiscal note types",
        response: {
            200: getTypesResponseSchema,
            500: errorResponseSchema,
        },
    },
};

export const createTypeRouteOptions = {
    config: { rateLimit: rateLimitProfiles.standard },
    schema: {
        tags: ["NF Menu"],
        summary: "Create a fiscal note type",
        body: createTypeSchema,
        response: { 201: typeResponseSchema, 400: errorResponseSchema, 409: errorResponseSchema },
    },
};

export const deactivateTypeRouteOptions = {
    config: { rateLimit: rateLimitProfiles.standard },
    schema: {
        tags: ["NF Menu"],
        summary: "Deactivate a fiscal note type",
        params: typeIdParamsSchema,
        response: { 200: typeResponseSchema, 404: errorResponseSchema },
    },
};

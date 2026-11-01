import { rateLimitProfiles } from "@/policies/rateLimit";
import { errorResponseSchema } from "@/router/error.schema";
import {
    adminListQuerySchema,
    adminListResponseSchema,
    adminRecordBodySchema,
    adminRecordParamsSchema,
    adminRecordResponseSchema,
    adminTableParamsSchema,
} from "./adminData.schemas";

const common = {
    config: { rateLimit: rateLimitProfiles.standard },
};

export const adminListOptions = {
    ...common,
    schema: {
        tags: ["admin", "table", "list"],
        summary: "List administrative records",
        description:
            "Lists active and inactive records with every non-sensitive column, including createdAt and updatedAt.",
        params: adminTableParamsSchema,
        querystring: adminListQuerySchema,
        response: { 200: adminListResponseSchema, 400: errorResponseSchema, 500: errorResponseSchema },
    },
};

export const adminDetailOptions = {
    ...common,
    schema: {
        tags: ["admin", "table", "detail"],
        summary: "Get an administrative record",
        params: adminRecordParamsSchema,
        response: { 200: adminRecordResponseSchema, 400: errorResponseSchema, 404: errorResponseSchema },
    },
};

export const adminCreateOptions = {
    ...common,
    schema: {
        tags: ["admin", "table", "create"],
        summary: "Create an administrative record",
        params: adminTableParamsSchema,
        body: adminRecordBodySchema,
        response: { 201: adminRecordResponseSchema, 400: errorResponseSchema, 409: errorResponseSchema },
    },
};

export const adminUpdateOptions = {
    ...common,
    schema: {
        tags: ["admin", "table", "update"],
        summary: "Update an administrative record",
        params: adminRecordParamsSchema,
        body: adminRecordBodySchema,
        response: { 200: adminRecordResponseSchema, 400: errorResponseSchema, 404: errorResponseSchema, 409: errorResponseSchema },
    },
};

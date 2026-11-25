import { errorResponseSchema } from "@/router/error.schema";
import {
    approveCompanyRequestResponseSchema,
    companyRequestIdParamsSchema,
    listCompanyRequestsQuerySchema,
    listCompanyRequestsResponseSchema,
    rejectCompanyRequestBodySchema,
    rejectCompanyRequestResponseSchema,
} from "./adminCompanyRequests.schemas";

export const listCompanyRequestsOptions = {
    schema: {
        tags: ["Platform Admin", "Companies"],
        summary: "List company onboarding requests (Platform Admin only)",
        querystring: listCompanyRequestsQuerySchema,
        response: {
            200: listCompanyRequestsResponseSchema,
            401: errorResponseSchema,
            403: errorResponseSchema,
            500: errorResponseSchema,
        },
    },
};

export const approveCompanyRequestOptions = {
    schema: {
        tags: ["Platform Admin", "Companies"],
        summary: "Approve company registration request and provision company + company_admin",
        params: companyRequestIdParamsSchema,
        response: {
            200: approveCompanyRequestResponseSchema,
            401: errorResponseSchema,
            403: errorResponseSchema,
            404: errorResponseSchema,
            409: errorResponseSchema,
            500: errorResponseSchema,
        },
    },
};

export const rejectCompanyRequestOptions = {
    schema: {
        tags: ["Platform Admin", "Companies"],
        summary: "Reject company registration request with reason",
        params: companyRequestIdParamsSchema,
        body: rejectCompanyRequestBodySchema,
        response: {
            200: rejectCompanyRequestResponseSchema,
            400: errorResponseSchema,
            401: errorResponseSchema,
            403: errorResponseSchema,
            404: errorResponseSchema,
            409: errorResponseSchema,
            500: errorResponseSchema,
        },
    },
};

import { rateLimitProfiles } from "@/policies/rateLimit";
import { errorResponseSchema } from "@/router/error.schema";
import {
    createCompanyRequestBodySchema,
    createCompanyRequestResponseSchema,
    requestCompanyCodeBodySchema,
    requestCompanyCodeResponseSchema,
} from "./companyRequests.schemas";

export const requestCompanyCodeOptions = {
    config: {
        rateLimit: rateLimitProfiles.default,
    },
    schema: {
        tags: ["Auth", "Companies"],
        summary: "Request email OTP for company registration request",
        body: requestCompanyCodeBodySchema,
        response: {
            200: requestCompanyCodeResponseSchema,
            400: errorResponseSchema,
            409: errorResponseSchema,
            500: errorResponseSchema,
        },
    },
};

export const createCompanyRequestOptions = {
    config: {
        rateLimit: rateLimitProfiles.standard,
    },
    schema: {
        tags: ["Auth", "Companies"],
        summary: "Submit a company registration request (awaits SaaS Admin approval)",
        body: createCompanyRequestBodySchema,
        response: {
            201: createCompanyRequestResponseSchema,
            400: errorResponseSchema,
            409: errorResponseSchema,
            500: errorResponseSchema,
        },
    },
};

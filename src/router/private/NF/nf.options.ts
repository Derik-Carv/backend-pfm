import { rateLimitProfiles } from "@/policies/rateLimit";
import { errorResponseSchema } from "@/router/error.schema";
import { z } from "zod";
import { nfCreateResponseSchema } from "./nf.schemas";

export const createNfRouteOptions = {
    config: {
        rateLimit: rateLimitProfiles.standard,
    },
    schema: {
        consumes: ["multipart/form-data"],
        tags: ["NF Menu"],
        body: z.any(),
        summary: "Create a new nf",
        description: "Created service with details",
        response: {
            201: nfCreateResponseSchema,
            400: errorResponseSchema,
            404: errorResponseSchema,
            409: errorResponseSchema,
            500: errorResponseSchema,
        },
    },
};

// export const getMyServicesListRouteOptions = {
//     config: {
//         rateLimit: rateLimitProfiles.standard,
//     },
//     schema: {
//         tags: ["Services Menu"],
//         summary: "Menu my services",
//         description: "List services",
//         response: {
//             200: getMyServicesListResponseSchema,
//             400: errorResponseSchema,
//             404: errorResponseSchema,
//             409: errorResponseSchema,
//             500: errorResponseSchema,
//         },
//     },
// };

// export const editServicesRouteOptions = {
//     config: {
//         rateLimit: rateLimitProfiles.standard,
//     },
//     schema: {
//         tags: ["Services Menu"],
//         body: serviceEditBaseSchema,
//         summary: "Edit a service",
//         description: "Returns the edited service with all its details",
//         response: {
//             201: serviceEditResponseSchema,
//             400: errorResponseSchema,
//             404: errorResponseSchema,
//             409: errorResponseSchema,
//             500: errorResponseSchema,
//         },
//     },
// };

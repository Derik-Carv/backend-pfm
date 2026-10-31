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
        description:
            `Envie um multipart/form-data com os campos abaixo:

1. file: arquivo PDF da nota fiscal.
2. nf: string contendo o JSON abaixo.

Exemplo no frontend:

const formData = new FormData();
formData.append("file", pdfFile);
formData.append("nf", JSON.stringify({
  typeId: "uuid-do-tipo",
  numberNf: "123456",
  acessKey: "12345678901234567890123456789012345678901234",
  thirdPartyClientId: "uuid-do-cliente",
  emissionDate: "2026-10-31",
  totalValue: 5000,
  servicesId: "uuid-do-servico",
  movimentationId: "uuid-da-movimentacao"
}));

fetch("/nf", {
  method: "POST",
  body: formData
});

Não defina manualmente o header Content-Type. O cliente deve gerar multipart/form-data automaticamente.`,
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

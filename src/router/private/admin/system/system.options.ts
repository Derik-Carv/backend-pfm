import {
    adminSystemMetricsResponseSchema,
    adminHierarchyResponseSchema,
    adminCompanyClientsQuerySchema,
    adminCompanyClientsResponseSchema,
} from "./system.schemas";
import { errorResponseSchema } from "@/router/error.schema";

export const getSystemMetricsOptions = {
    schema: {
        tags: ["Admin System"],
        summary: "Obter métricas de monitoramento, saúde e uso da plataforma",
        response: {
            200: adminSystemMetricsResponseSchema,
            401: errorResponseSchema,
            403: errorResponseSchema,
            500: errorResponseSchema,
        },
    },
};

export const getCascadeHierarchyOptions = {
    schema: {
        tags: ["Admin System"],
        summary: "Obter estrutura em cascata de empresas, filiais e contagens para administração global",
        response: {
            200: adminHierarchyResponseSchema,
            401: errorResponseSchema,
            403: errorResponseSchema,
            500: errorResponseSchema,
        },
    },
};

export const getCompanyClientsOptions = {
    schema: {
        tags: ["Admin System"],
        summary: "Consultar os clientes diretos de uma empresa ou filial específica",
        querystring: adminCompanyClientsQuerySchema,
        response: {
            200: adminCompanyClientsResponseSchema,
            400: errorResponseSchema,
            401: errorResponseSchema,
            403: errorResponseSchema,
            500: errorResponseSchema,
        },
    },
};

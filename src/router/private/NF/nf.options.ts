import { rateLimitProfiles } from "@/policies/rateLimit";
import { errorResponseSchema } from "@/router/error.schema";
import { z } from "zod";
import {
    nfCreateResponseSchema,
    nfActivateResponseSchema,
    nfDeactivateBodySchema,
    nfDeactivateParamsSchema,
    nfDeactivateResponseSchema,
    nfListQuerySchema,
    getNfListResponseSchema,
    nfPdfInconsistencyResponseSchema,
    sendEmailNfSchema,
    sendEmailNfResponseSchema,
} from "./nf.schemas";

export const createNfRouteOptions = {
    config: {
        rateLimit: rateLimitProfiles.standard,
    },
    schema: {
        consumes: ["multipart/form-data"],
        tags: ["NF Menu"],
        body: z.any(),
        summary: "Create a new nf",
        description: `Envie um multipart/form-data com os campos abaixo:

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
    // movimentationId: "uuid-da-movimentacao" (opcional)
    }));

    fetch("/nf", {
    method: "POST",
    body: formData
    });

Não defina manualmente o header Content-Type. O cliente deve gerar multipart/form-data automaticamente.`,
        response: {
            201: nfCreateResponseSchema,
            400: z.union([
                nfPdfInconsistencyResponseSchema,
                errorResponseSchema,
            ]),
            404: errorResponseSchema,
            409: errorResponseSchema,
            500: errorResponseSchema,
        },
    },
};

export const listNfRouteOptions = {
    config: {
        rateLimit: rateLimitProfiles.standard,
    },
    schema: {
        tags: ["NF Menu"],
        summary: "List fiscal notes",
        description:
            "Lists fiscal notes with pagination and optional number, access key, value, emission date and status filters.",
        querystring: nfListQuerySchema,
        response: {
            200: getNfListResponseSchema,
            400: errorResponseSchema,
            422: errorResponseSchema,
            500: errorResponseSchema,
        },
    },
};

export const deactivateNfRouteOptions = {
    config: {
        rateLimit: rateLimitProfiles.standard,
    },
    schema: {
        tags: ["NF Menu"],
        summary: "Deactivate a fiscal note",
        description:
            "Soft-deactivates a fiscal note, preserving its record and recording the reason, date and responsible user.",
        params: nfDeactivateParamsSchema,
        body: nfDeactivateBodySchema,
        response: {
            200: nfDeactivateResponseSchema,
            400: errorResponseSchema,
            404: errorResponseSchema,
            409: errorResponseSchema,
            422: errorResponseSchema,
            500: errorResponseSchema,
        },
    },
};

export const activateNfRouteOptions = {
    config: {
        rateLimit: rateLimitProfiles.standard,
    },
    schema: {
        tags: ["NF Menu"],
        summary: "Activate a fiscal note",
        description:
            "Reactivates an inactive fiscal note and clears its deactivation data.",
        params: nfDeactivateParamsSchema,
        response: {
            200: nfActivateResponseSchema,
            404: errorResponseSchema,
            409: errorResponseSchema,
            422: errorResponseSchema,
            500: errorResponseSchema,
        },
    },
};

export const sendEmailNfRouteOptions = {
    config: {
        rateLimit: rateLimitProfiles.standard,
    },
    schema: {
        tags: ["NF Menu"],
        summary: "Send email with fiscal note",
        description: "Sends an email with the fiscal note attached.",
        body: sendEmailNfSchema,
        response: {
            201: sendEmailNfResponseSchema,
            400: errorResponseSchema,
            404: errorResponseSchema,
            409: errorResponseSchema,
            422: errorResponseSchema,
            500: errorResponseSchema,
        },
    },
};

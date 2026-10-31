import { z } from "zod";

const nfMultipartExample = JSON.stringify(
    {
        typeId: "uuid-do-tipo",
        numberNf: "123456",
        acessKey: "12345678901234567890123456789012345678901234",
        thirdPartyClientId: "uuid-do-cliente",
        emissionDate: "2026-10-31",
        totalValue: 5000,
        servicesId: "uuid-do-servico",
        movimentationId: "uuid-da-movimentacao",
    },
    null,
    2,
);

export const nfCreateBaseSchema = z.object({
    typeId: z.string(),
    numberNf: z.string(),
    acessKey: z.string().length(44),
    thirdPartyClientId: z.string(),
    emissionDate: z.string(),
    cancelDate: z.string().nullable().optional(),
    totalValue: z.number().nonnegative(),
    pathFile: z.string().nullable().optional(),
    servicesId: z.string(),
    movimentationId: z.string(),
    active: z.boolean().optional(),
});

export const nfCreateMultipartOpenApiSchema = {
    type: "object",
    required: ["file", "nf"],
    properties: {
        file: {
            type: "string",
            format: "binary",
            description: "Arquivo PDF da nota fiscal",
        },
        nf: {
            type: "string",
            description:
                "JSON serializado como texto. Envie este conteúdo no campo nf do multipart.",
            example: nfMultipartExample,
            examples: [nfMultipartExample],
            default: nfMultipartExample,
        },
    },
};

export const nfCreateResponseSchema = z.object({
    message: z.string(),
    nf: z.object({
        id: z.string(),
        typeId: z.string(),
        numberNf: z.string(),
        acessKey: z.string().length(44),
        thirdPartyClientId: z.string(),
        emissionDate: z.string(),
        cancelDate: z.string().nullable().optional(),
        totalValue: z.string(),
        pathFile: z.string().nullable().optional(),
        servicesId: z.string(),
        movimentationId: z.string(),
        active: z.boolean(),
        createdAt: z.date(),
        updatedAt: z.date(),
    }),
});

export const getNfListResponseSchema = z.object({
    message: z.string(),
    nf: z.object({
        list: z.array(nfCreateResponseSchema),
    }),
});

// export const serviceEditBaseSchema = z.object({
//     serviceName: z.string().nullable().optional(),
//     price: z.string().nullable().optional(),
//     initialDate: z.string().nullable().optional(),
//     finishDate: z.string().nullable().optional(),
//     clientId: z.string().nullable().optional(),
//     details: z.string().nullable().optional(),
//     statusServiceId: z.string().nullable().optional(),
// });

// export const serviceEditResponseSchema = z.object({
//     message: z.string(),
//     service: z.object({
//         id: z.string(),
//         serviceName: z.string(),
//         price: z.string(),
//         initialDate: z.string(),
//         finishDate: z.string().nullable().optional(),
//         clientId: z.string(),
//         details: z.string(),
//         statusServiceId: z.string().nullable().optional(),
//     }),
// });

export type NfCreateInput = z.infer<typeof nfCreateBaseSchema>;
// export type ServiceEditInput = z.infer<typeof serviceEditBaseSchema>;

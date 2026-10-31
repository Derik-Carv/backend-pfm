import { z } from "zod";

export const bodySchemaCreateNf = {
    type: "object",
    properties: {
        file: {
            type: "string",
            format: "binary",
        },
        nf: {
            type: "string",
            description: "JSON com os dados da NF",
        },
    },
    required: ["file", "nf"],
};

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

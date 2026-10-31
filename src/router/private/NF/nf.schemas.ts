import { z } from "zod";

export const nfAccessKeySchema = z.union([
    z.string().regex(/^\d{44}$/, "A chave deve conter 44 dígitos"),
    z.string().regex(/^\d{50}$/, "A chave deve conter 50 dígitos"),
]);

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
    acessKey: nfAccessKeySchema,
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

export const nfItemResponseSchema = z.object({
    id: z.string().uuid(),
    typeId: z.string().uuid(),
    numberNf: z.string().nullable(),
    acessKey: nfAccessKeySchema.nullable(),
    thirdPartyClientId: z.string().uuid(),
    emissionDate: z.string(),
    cancelDate: z.string().nullable(),
    totalValue: z.string(),
    pathFile: z.string().nullable(),
    servicesId: z.string().uuid(),
    movimentationId: z.string().uuid(),
    active: z.boolean(),
    deactivationReason: z.string().nullable(),
    deactivatedAt: z.date().nullable(),
    deactivatedBy: z.string().uuid().nullable(),
    createdAt: z.date(),
    updatedAt: z.date(),
});

export const nfCreateResponseSchema = z.object({
    message: z.string(),
    nf: nfItemResponseSchema,
});

export const nfPdfInconsistencyResponseSchema = z.object({
    message: z.string(),
    inconsistencies: z.array(
        z.object({
            field: z.enum([
                "numberNf",
                "acessKey",
                "emissionDate",
                "totalValue",
            ]),
            sentValue: z.union([z.string(), z.number()]),
            pdfValue: z.union([z.string(), z.number()]).nullable(),
        }),
    ),
});

export const getNfListResponseSchema = z.object({
    message: z.string(),
    notes: z.array(nfItemResponseSchema),
    pagination: z.object({
        page: z.number(),
        limit: z.number(),
        total: z.number(),
        totalPages: z.number(),
        hasMore: z.boolean(),
    }),
});

export const nfListQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    note_number: z.string().trim().min(1).optional(),
    access_key: z.string().trim().min(1).max(50).optional(),
    min_value: z.coerce.number().nonnegative().optional(),
    max_value: z.coerce.number().nonnegative().optional(),
    start_date: z.string().date().optional(),
    end_date: z.string().date().optional(),
    status: z.enum(["active", "inactive", "cancelled"]).default("active"),
}).superRefine((query, context) => {
    if (
        query.min_value !== undefined &&
        query.max_value !== undefined &&
        query.min_value > query.max_value
    ) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["min_value"],
            message: "min_value must be less than or equal to max_value",
        });
    }

    if (
        query.start_date !== undefined &&
        query.end_date !== undefined &&
        query.start_date > query.end_date
    ) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["start_date"],
            message: "start_date must be less than or equal to end_date",
        });
    }
});

export const nfDeactivateParamsSchema = z.object({
    id: z.string().uuid(),
});

export const nfDeactivateBodySchema = z.object({
    reason: z.string().trim().min(5).max(500),
});

export const nfDeactivateResponseSchema = z.object({
    message: z.string(),
    note: nfItemResponseSchema,
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
export type NfListQuery = z.infer<typeof nfListQuerySchema>;
export type NfDeactivateParams = z.infer<typeof nfDeactivateParamsSchema>;
export type NfDeactivateBody = z.infer<typeof nfDeactivateBodySchema>;
// export type ServiceEditInput = z.infer<typeof serviceEditBaseSchema>;

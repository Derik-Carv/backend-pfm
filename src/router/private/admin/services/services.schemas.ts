import { z } from "zod";

export const getAllServicesResponseSchema = z.object({
    message: z.string(),
    allServices: z.array(
        z.object({
            id: z.string(),
            serviceName: z.string(),
            price: z.union([z.string(), z.number()]),
            initialDate: z.string(),
            finishDate: z.string().nullable().optional(),
            clientId: z.string(),
            details: z.string(),
            statusServiceId: z.string().nullable().optional(),
            createdAt: z.date(),
            updatedAt: z.date(),
        }),
    ),
});

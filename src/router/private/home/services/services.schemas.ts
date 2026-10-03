import { z } from "zod";

export const getServicesResponseSchema = z.object({
    message: z.string(),
    user: z.object({
        id: z.string(),
        servicename: z.string(),
        price: z.number().positive(),
        initialDate: z.string(),
        finishDate: z.string(),
        clientId: z.string(),
        details: z.string(),
        statusServiceId: z.string(),
        active: z.boolean(),
        createdAt: z.string(),
        updatedAt: z.string(),
    }),
});

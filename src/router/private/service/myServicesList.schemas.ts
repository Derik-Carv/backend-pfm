import { z } from "zod";

const serviceBaseSchema = z.object({
    id: z.string(),
    serviceName: z.string(),
    price: z.union([z.string(), z.number()]),
    initialDate: z.string(),
    finishDate: z.string().nullable().optional(),
    clientId: z.string(),
    details: z.string(),
    statusServiceId: z.string().nullable().optional(),
});

export const getMyServicesListResponseSchema = z.object({
    message: z.string(),
    myServicesList: z.object({
        list: z.array(serviceBaseSchema),
    }),
});

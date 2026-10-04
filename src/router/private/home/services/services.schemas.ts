import { z } from "zod";

const serviceBaseSchema = z.object({
    id: z.string(),
    serviceName: z.string(),
    price: z.union([z.string(), z.number()]),
    initialDate: z.string(),
    finishDate: z.string(),
    clientId: z.string(),
    details: z.string(),
    statusServiceId: z.string().nullable().optional(),
});

export const getServiceResponseSchema = z.object({
    message: z.string(),
    service: z.object({
        id: z.string(),
        serviceName: z.string(),
        price: z.number().positive(),
        initialDate: z.string(),
        finishDate: z.string(),
        clientId: z.string(),
        details: z.string(),
        statusServiceId: z.string(),
        createdAt: z.string(),
        updatedAt: z.string(),
    }),
});

export const getMenuOverviewResponseSchema = z.object({
    message: z.string(),
    data: z.object({
        highValueServices: z.array(serviceBaseSchema),
        recentServices: z.array(serviceBaseSchema),
        oldestServices: z.array(serviceBaseSchema),
    }),
});

export const getMyServicesResponseSchema = z.object({
    message: z.string(),
    services: z.array(getServiceResponseSchema.shape.service),
});

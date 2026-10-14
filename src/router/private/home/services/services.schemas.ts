import { z } from "zod";

export const getServicesFinderParamsSchema = z.object({
    type: z.enum(["id", "client", "price", "initialdate", "finishdate"]),
    finder: z.string().min(1),
});

const serviceHomeSchema = z.object({
    id: z.string(),
    serviceName: z.string(),
    price: z.union([z.string(), z.number()]),
    initialDate: z.string(),
    finishDate: z.string().nullable().optional(),
    clientId: z.string(),
    clientName: z.string().nullable(),
    details: z.string(),
    statusServiceId: z.string().nullable().optional(),
    statusName: z.string().nullable(),
});

export const getServiceResponseSchema = z.object({
    message: z.string(),
    service: z.object({
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
});

export const getMenuOverviewResponseSchema = z.object({
    message: z.string(),
    data: z.object({
        highValueServices: z.array(serviceHomeSchema),
        recentServices: z.array(serviceHomeSchema),
        oldestServices: z.array(serviceHomeSchema),
    }),
});

export const getMyServicesResponseSchema = z.object({
    message: z.string(),
    services: z.object({
        list: z.array(serviceHomeSchema),
        pagination: z.object({
            page: z.number().int(),
            limit: z.number().int(),
            total: z.number().int(),
            totalPages: z.number().int(),
            hasMore: z.boolean(),
        }),
    }),
});

export const getMyServicesFinderResponseSchema = z.object({
    message: z.string(),
    finder: z.object({
        list: z.array(serviceHomeSchema),
        pagination: z.object({
            page: z.number().int(),
            limit: z.number().int(),
            total: z.number().int(),
            totalPages: z.number().int(),
            hasMore: z.boolean(),
        }),
    }),
});

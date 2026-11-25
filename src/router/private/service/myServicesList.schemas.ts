import { z } from "zod";

export const serviceCreateBaseSchema = z.object({
    serviceName: z.string().trim().min(1).max(200),
    price: z.string().regex(/^\d+(\.\d+)?$/),
    initialDate: z.string().trim().min(1),
    finishDate: z.string().nullable().optional(),
    clientId: z.string().uuid(),
    details: z.string().trim().min(1).max(2000),
    statusServiceId: z.string().uuid().nullable().optional(),
});

const serviceListItemSchema = z.object({
    id: z.string().uuid(),
    serviceName: z.string(),
    price: z.string(),
    initialDate: z.string(),
    finishDate: z.string().nullable().optional(),
    clientId: z.string(),
    details: z.string(),
    statusServiceId: z.string().nullable().optional(),
});

export const getServicesCreateResponseSchema = z.object({
    message: z.string(),
    service: z.object({
        id: z.string(),
        serviceName: z.string(),
        price: z.string(),
        initialDate: z.string(),
        finishDate: z.string().nullable().optional(),
        clientId: z.string(),
        details: z.string(),
        statusServiceId: z.string().nullable().optional(),
    }),
});

export const getMyServicesListResponseSchema = z.object({
    message: z.string(),
    myServicesList: z.object({
        list: z.array(serviceListItemSchema),
    }),
});

export const servicesListQuerySchema = z.object({
    clientId: z.string().uuid().optional(),
});

export const serviceEditBaseSchema = z.object({
    serviceName: z.string().nullable().optional(),
    price: z.string().nullable().optional(),
    initialDate: z.string().nullable().optional(),
    finishDate: z.string().nullable().optional(),
    clientId: z.string().nullable().optional(),
    details: z.string().nullable().optional(),
    statusServiceId: z.string().nullable().optional(),
});

export const serviceEditResponseSchema = z.object({
    message: z.string(),
    service: z.object({
        id: z.string(),
        serviceName: z.string(),
        price: z.string(),
        initialDate: z.string(),
        finishDate: z.string().nullable().optional(),
        clientId: z.string(),
        details: z.string(),
        statusServiceId: z.string().nullable().optional(),
    }),
});

export type ServiceCreateInput = z.infer<typeof serviceCreateBaseSchema>;
export type ServiceEditInput = z.infer<typeof serviceEditBaseSchema>;

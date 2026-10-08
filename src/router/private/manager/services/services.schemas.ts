import { z } from "zod";

export const serviceBaseSchema = z.object({
    id: z.string(),
    serviceName: z.string(),
    price: z.string().regex(/^\d+(\.\d+)?$/),
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
        price: z.string().regex(/^\d+(\.\d+)?$/),
        initialDate: z.string(),
        finishDate: z.string().nullable(),
        clientId: z.string(),
        details: z.string(),
        statusServiceId: z.string(),
        createdAt: z.date(),
        updatedAt: z.date(),
    }),
});

export const getStatusResponseSchema = z.object({
    message: z.string(),
    status: z.object({
        id: z.string(),
        name: z.string(),
    }),
});

export const createServiceInputSchema = z.object({
    serviceName: z.string().min(1, { message: "Service name is required" }),
    price: z
        .string()
        .regex(/^\d+(\.\d+)?$/, { message: "Price must be a valid number" }),
    initialDate: z.string({ message: "Initial date is required" }),
    clientId: z.string({ message: "Client ID must be a valid UUID" }),
    details: z.string().min(1, { message: "Details are required" }),
    statusServiceId: z.string().optional(),
});

export type CreateServiceInput = z.infer<typeof createServiceInputSchema>;
export type CreateServiceResponse = z.infer<typeof getServiceResponseSchema>;
export type GetStatusResponse = z.infer<typeof getStatusResponseSchema>;

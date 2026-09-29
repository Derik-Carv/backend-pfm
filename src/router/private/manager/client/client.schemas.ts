import { cpfClean } from "@/utils/checkCpf";
import { z } from "zod";

export const createClientSchema = z
    .object({
        registeredCompanyName: z
            .string({ message: "Company Name is required" })
            .trim()
            .min(1, { message: "Company Name must have at least 1 characters" })
            .max(100, {
                message: "Company Name can have at most 100 characters",
            })
            .toLowerCase(),
        tradeName: z
            .string({ message: "Trade Name is required" })
            .trim()
            .min(1, { message: "Trade Name must have at least 1 characters" })
            .max(100, { message: "Trade Name can have at most 100 characters" })
            .toLowerCase(),
        cpf: z
            .string()
            .trim()
            .transform((val) => (!val ? undefined : cpfClean(val)))
            .refine((val) => (!val ? undefined : val.length === 11), {
                message: "CPF must contain exactly 11 digits",
            })
            .optional(),
        cnpj: z
            .string()
            .trim()
            .max(100, { message: "Trade Name can have at most 100 characters" })
            .toLowerCase()
            .optional(),

        active: z.boolean().default(true),
    })
    .strict();

const clientItemSchema = z.object({
    id: z.string(),
    registeredCompanyName: z.string(),
    tradeName: z.string(),
    cnpj: z.string(),
    cpf: z.string(),
    active: z.boolean(),
    createdAt: z.date(),
    updatedAt: z.date(),
});

export const createClientResponseSchema = z.object({
    message: z.string(),
    client: clientItemSchema,
});

export const getClientsResponseSchema = z.object({
    message: z.string(),
    clients: z.array(clientItemSchema),
});

export type CreateClientInput = z.infer<typeof createClientSchema>;
export type CreateClientResponse = z.infer<typeof createClientResponseSchema>;

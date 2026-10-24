import { z } from "zod";

export type Pagination = {
    page: number;
    limit: number;
};

export const paginationQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(10).default(10),
});

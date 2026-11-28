import { z } from "zod";

export const healthOkResponse = z.object({
    status: z.string(),
    version: z.string().optional(),
    uptime: z.number().optional(),
    timestamp: z.string().optional(),
});

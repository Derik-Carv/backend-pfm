import { z } from "zod";

export const healthOkResponse = z.object({
    status: z.string(),
    uptime: z.number().optional(),
    timestamp: z.string().optional(),
});

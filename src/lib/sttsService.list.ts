import { StatusServiceRepository } from "@/database/tables/statusService/statusService.repository";

const status = new StatusServiceRepository();

const statusFromDb = await status.findActives();

export const allStatusServices = statusFromDb.reduce(
    (acc, status) => {
        acc[status.name] = status.name;
        return acc;
    },
    {} as Record<string, string>,
);

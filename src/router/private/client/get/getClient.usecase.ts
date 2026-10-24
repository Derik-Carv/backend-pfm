import type { ClientDependencies } from "@/database/tables/clients/clients.interface";
import type { Pagination } from "@/router/pagination.schema";

export function injectUseCaseActiveClients({ clientsDb }: ClientDependencies) {
    return async function usecaseAllCLients(pagination: Pagination) {
        const offset = (pagination.page - 1) * pagination.limit;
        const result = await clientsDb.findPage(pagination.limit, offset);

        return {
            list: result.list,
            pagination: {
                page: pagination.page,
                limit: pagination.limit,
                total: result.total,
                totalPages: Math.ceil(result.total / pagination.limit),
                hasMore: offset + result.list.length < result.total,
            },
        };
    };
}

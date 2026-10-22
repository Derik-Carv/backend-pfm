import { ClientRepository } from "@/database/tables/clients/clients.repository";

export async function usecaseAllCLients(pagination: {
    page: number;
    limit: number;
}) {
    const clients = new ClientRepository();

    const offset = (pagination.page - 1) * pagination.limit;
    const result = await clients.findPage(pagination.limit, offset);

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
}

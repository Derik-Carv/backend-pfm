import { UsersRepository } from "@/database/tables/users/users.repository";

export async function usecaseGetUser(pagination: {
    page: number;
    limit: number;
}) {
    const userRepository = new UsersRepository();

    const offset = (pagination.page - 1) * pagination.limit;
    const result = await userRepository.findActivePage(
        pagination.limit,
        offset,
    );

    if (!result) throw new Error("USERS_DATA_ERROR");
    if (result.total === 0) throw new Error("USERS_NO_DATA");

    return {
        list: result.list.map(({ role, ...users }) => ({
            ...users,
            roleId: role.name,
        })),
        pagination: {
            page: pagination.page,
            limit: pagination.limit,
            total: result.total,
            totalPages: Math.ceil(result.total / pagination.limit),
            hasMore: offset + result.list.length < result.total,
        },
    };
}

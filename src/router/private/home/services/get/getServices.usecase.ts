import { allRoles } from "@/lib/roles.list";
import { UsersRepository } from "@/database/tables/users/users.repository";
import { RoleRepository } from "@/database/tables/roles/roles.repository";
import { ServicesRepository } from "@/database/tables/services/services.repository";

export async function usecaseGetService(
    userId: string,
    pagination: { page: number; limit: number },
) {
    const allowedRoles = [
        allRoles.administrator,
        allRoles.manager,
        allRoles.finance,
        allRoles.observer,
        allRoles.colaborator,
    ];

    const userData = new UsersRepository();
    const roleData = new RoleRepository();
    const servicesData = new ServicesRepository();

    const user = await userData.findId(userId);
    if (!user) {
        throw new Error("USER_NOT_FOUND");
    }

    const userRole = await roleData.findById(user.roleId);

    if (!userRole) {
        throw new Error("ROLE_NOT_FOUND");
    }

    const roleCheck = allowedRoles.includes(userRole.name);

    if (!roleCheck) {
        throw new Error("ROLE_ACESS_DENIED");
    }

    const offset = (pagination.page - 1) * pagination.limit;
    const result = await servicesData.findActivePage(
        pagination.limit,
        offset,
        userRole.name === allRoles.colaborator ? userId : undefined,
    );

    if (!result) throw new Error("SERVICES_DATA_ERROR");
    if (result.total === 0) throw new Error("SERVICES_NO_DATA");

    return {
        list: result.list.map(({ client, status, ...service }) => ({
            ...service,
            clientName: client.tradeName,
            statusName: status?.name ?? null,
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

import { allRoles } from "@/lib/roles.list";
import { UsersRepository } from "@/database/tables/users/users.repository";
import { RoleRepository } from "@/database/tables/roles/roles.repository";
import { ServicesRepository } from "@/database/tables/services/services.repository";
import { paginationQuerySchema } from "@/router/pagination.schema";
import { getServicesFinderParamsSchema } from "../services.schemas";
import type { z } from "zod";

type FinderParams = z.infer<typeof getServicesFinderParamsSchema>;
type Pagination = z.infer<typeof paginationQuerySchema>;

export async function usecaseMyServicesHomeFind(
    userId: string,
    finder: FinderParams,
    pagination: Pagination,
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
    const result = await servicesData.findFinderPage(
        finder.type,
        finder.finder,
        pagination.limit,
        offset,
        userRole.name === allRoles.colaborator ? userId : undefined,
    );

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

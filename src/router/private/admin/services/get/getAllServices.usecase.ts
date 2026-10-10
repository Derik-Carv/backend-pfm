import { allRoles } from "@/lib/roles.list";
import { UsersRepository } from "@/database/tables/users/users.repository";
import { RoleRepository } from "@/database/tables/roles/roles.repository";
import { ServicesRepository } from "@/database/tables/services/services.repository";

export async function usecaseGetAllServices(userId: string) {
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
    const userRole = await roleData.findById(user.roleId);

    if (!userRole) {
        throw new Error("ROLE_NOT_FOUND");
    }

    const roleCheck = allowedRoles.includes(userRole.name);

    if (!roleCheck) {
        throw new Error("ROLE_ACESS_DENIED");
    }

    return await servicesData.findAll();
}

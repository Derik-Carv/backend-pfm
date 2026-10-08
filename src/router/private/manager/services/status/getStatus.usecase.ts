import { allRoles } from "@/lib/roles.list";
import { UsersRepository } from "@/database/tables/users/users.repository";
import { RoleRepository } from "@/database/tables/roles/roles.repository";
import { StatusServiceRepository } from "@/database/tables/statusService/statusService.repository";

export async function usecaseGetStatusService(userId: string) {
    const allowedRoles = Object.values(allRoles);

    const userData = new UsersRepository();
    const roleData = new RoleRepository();
    const statusData = new StatusServiceRepository();

    const user = await userData.findId(userId);
    const userRole = await roleData.findById(user.roleId);

    if (!userRole) {
        throw new Error("ROLE_NOT_FOUND");
    }

    const roleCheck = allowedRoles.includes(userRole.name);

    if (!roleCheck) {
        throw new Error("ROLE_ACESS_DENIED");
    }

    const actives = await statusData.findActives();

    if (!actives || actives.length === 0) {
        throw new Error("STATUS_SERVICE_NOT_FOUND");
    }

    return actives.map((status) => ({
        id: status.id,
        name: status.name,
    }));
}

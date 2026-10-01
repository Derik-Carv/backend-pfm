import { RoleRepository } from "@/database/tables/roles/roles.repository";

export async function usecaseGetRole() {
    const role = new RoleRepository();

    const checkRoles = await role.findActives();

    if (!checkRoles || checkRoles.length <= 0) {
        throw new Error("ROLES_NOT_FOUND");
    }

    return checkRoles;
}

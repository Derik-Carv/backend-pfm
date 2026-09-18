import { getRolesRepository } from "@/database/users/roles.repository";

export async function usecaseGetRole() {
    const checkRoles = await getRolesRepository();

    if (!checkRoles || checkRoles.length <= 0) {
        throw new Error("ROLES_NOT_FOUND");
    }

    return checkRoles;
}

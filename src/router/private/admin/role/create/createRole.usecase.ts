import {
    createRoleRepository,
    getRoleForNameRepository,
} from "@/database/roles/roles.repository";

export async function usecaseCreateRole(name: string) {
    const checkName = await getRoleForNameRepository(name);

    if (checkName) {
        throw new Error("ROLE_ALREADY_EXISTS");
    }
    return await createRoleRepository(name);
}

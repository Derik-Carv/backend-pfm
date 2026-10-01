import { RoleRepository } from "@/database/tables/roles/roles.repository";

export async function usecaseCreateRole(name: string) {
    const role = new RoleRepository();

    const data = { name: name };

    const checkName = await role.findByName(data.name);

    if (checkName) {
        throw new Error("ROLE_ALREADY_EXISTS");
    }
    return await role.create(data);
}

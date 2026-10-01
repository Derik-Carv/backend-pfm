import { RoleRepository } from "@/database/tables/roles/roles.repository";

const roles = new RoleRepository();

const rolesFromDb = await roles.findActives();

export const allRoles = rolesFromDb.reduce(
    (acc, role) => {
        acc[role.name] = role.name;
        return acc;
    },
    {} as Record<string, string>,
);

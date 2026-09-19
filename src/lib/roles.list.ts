import { getRolesRepository } from "@/database/roles/roles.repository";

const rolesFromDb = await getRolesRepository();

export const allRoles = rolesFromDb.reduce(
    (acc, role) => {
        acc[role.name] = role.name;
        return acc;
    },
    {} as Record<string, string>,
);

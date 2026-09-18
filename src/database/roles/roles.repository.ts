import { db } from "@/database/index";
import { roles } from "@/database/schema/schema";
import { eq } from "drizzle-orm";

export async function createRoleRepository(name: string) {
    const [newRole] = await db.insert(roles).values({ name }).returning();
    return newRole;
}

export async function getRolesRepository() {
    return await db.query.roles.findMany();
}

export async function getRoleForNameRepository(nameCheck: string) {
    try {
        const [role] = await db
            .select()
            .from(roles)
            .where(eq(roles.name, nameCheck))
            .limit(1);

        return role;
    } catch (err) {
        return false;
    }
}

export async function getRoleForidRepository(idCheck: string) {
    try {
        const [role] = await db
            .select()
            .from(roles)
            .where(eq(roles.id, idCheck))
            .limit(1);

        return role;
    } catch (err) {
        return false;
    }
}

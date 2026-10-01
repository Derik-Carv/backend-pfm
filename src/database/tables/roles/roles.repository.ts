import { db } from "@/database/index";
import { eq } from "drizzle-orm";
import type {
    CreateRoleDatabaseInput,
    IRoles,
    Roles,
} from "@/database/tables/roles/roles.interface";
import { roles } from "@/database/schema/schema";

export class RoleRepository implements IRoles {
    async create(data: CreateRoleDatabaseInput): Promise<Roles> {
        const [newRole] = await db.insert(roles).values(data).returning();
        return newRole;
    }

    async findAll(): Promise<Roles[]> {
        return await db.query.roles.findMany();
    }

    async findById(id: string): Promise<Roles | null> {
        const [role] = await db
            .select()
            .from(roles)
            .where(eq(roles.id, id))
            .limit(1);

        return role || null;
    }

    async findByName(name: string): Promise<Roles | null> {
        const [role] = await db
            .select()
            .from(roles)
            .where(eq(roles.name, name))
            .limit(1);

        return role || null;
    }

    async findActives(): Promise<Roles[]> {
        return await db.select().from(roles).where(eq(roles.active, true));
    }

    async findInactives(): Promise<Roles[]> {
        return await db.select().from(roles).where(eq(roles.active, false));
    }
}

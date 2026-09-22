import { db } from "@/database/index";
import { type } from "@/database/schema/schema";
import { eq } from "drizzle-orm";

type CreateTypeDatabaseInput = typeof type.$inferInsert;

export async function getAllTypesRepository() {
    return await db.query.type.findMany();
}

export async function createTypeRepository(data: CreateTypeDatabaseInput) {
    const [newType] = await db.insert(type).values(data).returning();
    return newType;
}

export async function getTypeForNameRepository(name: string) {
    try {
        const [typeName] = await db
            .select()
            .from(type)
            .where(eq(type.name, name))
            .limit(1);

        return typeName;
    } catch (err) {
        return false;
    }
}

export async function getTypeForIdRepository(id: string) {
    try {
        const [typeId] = await db
            .select()
            .from(type)
            .where(eq(type.id, id))
            .limit(1);

        return typeId;
    } catch (err) {
        return false;
    }
}

export async function getAllTypeActivesRepository() {
    try {
        const [actives] = await db
            .select()
            .from(type)
            .where(eq(type.active, true))
            .limit(1);

        return actives;
    } catch (err) {
        return false;
    }
}

export async function getAllTypeInactivesRepository() {
    try {
        const [actives] = await db
            .select()
            .from(type)
            .where(eq(type.active, false))
            .limit(1);

        return actives;
    } catch (err) {
        return false;
    }
}

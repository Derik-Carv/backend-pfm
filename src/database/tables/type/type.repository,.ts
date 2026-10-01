import { db } from "@/database/index";
import { type } from "@/database/schema/schema";
import { eq } from "drizzle-orm";
import type { CreateTypeDatabaseInput, IType, Type } from "./type.interface";

export class TypeRepository implements IType {
    async create(data: CreateTypeDatabaseInput): Promise<Type> {
        const [newType] = await db.insert(type).values(data).returning();
        return newType;
    }

    async findAll(): Promise<Type[]> {
        return await db.query.type.findMany();
    }

    async findName(name: string): Promise<Type> {
        const [typeName] = await db
            .select()
            .from(type)
            .where(eq(type.name, name))
            .limit(1);

        return typeName || null;
    }

    async findId(id: string): Promise<Type> {
        const [typeId] = await db
            .select()
            .from(type)
            .where(eq(type.id, id))
            .limit(1);

        return typeId || null;
    }

    async findActives(): Promise<Type[]> {
        return await db
            .select()
            .from(type)
            .where(eq(type.active, true))
            .limit(1);
    }

    async findInactives(): Promise<Type[]> {
        return await db
            .select()
            .from(type)
            .where(eq(type.active, false))
            .limit(1);
    }
}

import type { type } from "@/database/schema/schema";

export type CreateTypeDatabaseInput = typeof type.$inferInsert;
export type Type = typeof type.$inferSelect;

export interface IType {
    create(data: CreateTypeDatabaseInput): Promise<Type>;
    findId(id: string): Promise<Type>;
    findName(name: string): Promise<Type>;
    findAll(): Promise<Type[]>;
    findActives(): Promise<Type[]>;
    findInactives(): Promise<Type[]>;
}

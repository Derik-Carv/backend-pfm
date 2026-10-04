import type { roles } from "@/database/schema/schema";

export type CreateRoleDatabaseInput = typeof roles.$inferInsert;
export type Roles = typeof roles.$inferSelect;

export interface IRoles {
    create(data: CreateRoleDatabaseInput): Promise<Roles>;
    findById(id: string): Promise<Roles>;
    findIdServices(service: string): Promise<Roles>;
    findIdUsers(id: string): Promise<Roles>;
    findAll(): Promise<Roles[]>;
    findActives(): Promise<Roles[]>;
    findInactives(): Promise<Roles[]>;
}

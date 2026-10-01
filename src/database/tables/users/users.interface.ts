import type { users } from "@/database/schema/schema";

export type CreateUsersDatabaseInput = typeof users.$inferInsert;
export type Users = typeof users.$inferSelect;

export interface IUsers {
    create(data: CreateUsersDatabaseInput): Promise<Users>;
    findId(id: string): Promise<Users>;
    findName(name: string): Promise<Users>;
    findSurname(surname: string): Promise<Users>;
    findUsername(username: string): Promise<Users>;
    findRoleId(roleId: string): Promise<Users>;
    findCpf(cpf: string): Promise<Users>;
    findAll(): Promise<Users[]>;
    findActives(): Promise<Users[]>;
    findInactives(): Promise<Users[]>;
}

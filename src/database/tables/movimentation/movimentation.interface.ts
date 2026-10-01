import type { movimentation } from "@/database/schema/schema";

export type CreateMovimentationDatabaseInput =
    typeof movimentation.$inferInsert;
export type Movimentation = typeof movimentation.$inferSelect;

export interface IMovimentation {
    create(data: CreateMovimentationDatabaseInput): Promise<Movimentation>;
    findId(id: string): Promise<Movimentation>;
    findName(name: string): Promise<Movimentation>;
    findAll(): Promise<Movimentation[]>;
    findActives(): Promise<Movimentation[]>;
    findInactives(): Promise<Movimentation[]>;
}

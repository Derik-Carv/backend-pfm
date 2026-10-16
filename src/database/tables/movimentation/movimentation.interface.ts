import type { movimentation } from "@/database/schema/schema";

export type CreateMovimentationDatabaseInput =
    typeof movimentation.$inferInsert;
export type Movimentation = typeof movimentation.$inferSelect;

export type MovimentationPageItem = Pick<
    Movimentation,
    | "id"
    | "name"
    | "nfId"
    | "active"
    | "destinationUserId"
    | "destinationClientId"
    | "justify"
    | "createdAt"
> & {
    nf: { numberNf: string };
    user: { name: string };
    client: { tradeName: string };
};

export interface IMovimentation {
    create(data: CreateMovimentationDatabaseInput): Promise<Movimentation>;
    findId(id: string): Promise<Movimentation>;
    findName(name: string): Promise<Movimentation>;
    findActivePage(
        limit: number,
        offset: number,
    ): Promise<{ list: MovimentationPageItem[]; total: number }>;
    findAll(): Promise<Movimentation[]>;
    findActives(): Promise<Movimentation[]>;
    findInactives(): Promise<Movimentation[]>;
}

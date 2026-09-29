import { clients } from "@/database/schema/schema";

export type CreateClientDatabaseInput = typeof clients.$inferInsert;
export type Client = typeof clients.$inferSelect;

export interface IClient {
    create(data: CreateClientDatabaseInput): Promise<Client>;
    findById(id: string): Promise<Client | null>;
    findByCompanyName(name: string): Promise<Client | null>;
    findByTradeName(name: string): Promise<Client | null>;
    findByCpf(cpf: string): Promise<Client | null>;
    findByCnpj(cnpj: string): Promise<Client | null>;
    findAll(): Promise<Client[]>;
    findActives(): Promise<Client[]>;
    findInactives(): Promise<Client[]>;
}

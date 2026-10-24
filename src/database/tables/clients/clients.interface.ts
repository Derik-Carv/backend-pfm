import { clients } from "@/database/schema/schema";
import type { IUsers, Users } from "../users/users.interface";
import type { IRoles } from "../roles/roles.interface";

export type CreateClientDatabaseInput = typeof clients.$inferInsert;
export type Client = typeof clients.$inferSelect;

export type ClientDependencies = {
    clientsDb: Pick<IClient, "findPage">;
};

export type CreateClientDependencies = {
    clientsDb: Pick<
        IClient,
        | "create"
        | "findByCompanyName"
        | "findByTradeName"
        | "findByCpf"
        | "findByCnpj"
    >;
    findUser: Pick<IUsers, "findId">;
    findRole: Pick<IRoles, "findById">;
};

export type EditClientDependencies = {
    clientsDb: Pick<
        IClient,
        | "findByCompanyName"
        | "findByTradeName"
        | "findByCpf"
        | "findByCnpj"
        | "editByCompanyName"
        | "editByTradeName"
        | "editByCpf"
        | "editByCnpj"
        | "findById"
    >;
    findUser: {
        findId(id: string): Promise<Users | null>;
    };
    findRole: Pick<IRoles, "findById">;
};

export interface IClient {
    create(data: CreateClientDatabaseInput): Promise<Client>;
    findById(id: string): Promise<Client | null>;
    findByCompanyName(name: string): Promise<Client | null>;
    findByTradeName(name: string): Promise<Client | null>;
    findByCpf(cpf: string): Promise<Client | null>;
    findByCnpj(cnpj: string): Promise<Client | null>;
    editByCompanyName(id: string, name: string): Promise<Client | null>;
    editByTradeName(id: string, name: string): Promise<Client | null>;
    editByCnpj(id: string, cnpj: string): Promise<Client | null>;
    editByCpf(id: string, cpf: string): Promise<Client | null>;
    editByActive(id: string, active: boolean): Promise<Client | null>;
    findPage(
        limit: number,
        offset: number,
    ): Promise<{ list: Client[]; total: number }>;
    findAll(): Promise<Client[]>;
    findActives(): Promise<Client[]>;
    findInactives(): Promise<Client[]>;
}

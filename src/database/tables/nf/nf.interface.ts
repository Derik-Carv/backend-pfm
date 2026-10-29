import type { nf } from "@/database/schema/schema";
import type { IUsers } from "../users/users.interface";
import type { IRoles } from "../roles/roles.interface";
import type { IClient } from "../clients/clients.interface";
import type { IType } from "../type/type.interface";
import type { IServices } from "../services/services.interface";

export type CreateNfDatabaseInput = typeof nf.$inferInsert;
export type NF = typeof nf.$inferSelect;

export type CreateNfDependencies = {
    nf: Pick<INF, "create" | "findAcessKey" | "findNfNumber">;
    clientsDb: Pick<IClient, "findById">;
    findUser: Pick<IUsers, "findId">;
    findRole: Pick<IRoles, "findById">;
    findType: Pick<IType, "findId">;
    findService: Pick<IServices, "findId">;
};

export interface INF {
    create(data: CreateNfDatabaseInput): Promise<NF>;
    findId(id: string): Promise<NF>;
    findNfNumber(number: string): Promise<NF>;
    findAcessKey(acessKey: string): Promise<NF>;
    findClientId(clientId: string): Promise<NF>;
    findEmissionDate(emissionDate: string): Promise<NF>;
    findCancelDate(cancelDate: string): Promise<NF>;
    findTotalValue(totalValue: string): Promise<NF>;
    findServiceId(serviceId: string): Promise<NF>;
    findMovimentationId(movimentationId: string): Promise<NF>;
    findAll(): Promise<NF[]>;
    findActives(): Promise<NF[]>;
    findInactives(): Promise<NF[]>;
}

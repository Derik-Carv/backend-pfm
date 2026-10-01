import type { nf } from "@/database/schema/schema";

export type CreateNfDatabaseInput = typeof nf.$inferInsert;
export type NF = typeof nf.$inferSelect;

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

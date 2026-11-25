import type { services } from "@/database/schema/schema";

export type CreateServicesDatabaseInput = typeof services.$inferInsert;
export type Services = typeof services.$inferSelect;

export type ServicePageItem = Pick<
    Services,
    | "id"
    | "serviceName"
    | "price"
    | "initialDate"
    | "finishDate"
    | "clientId"
    | "details"
    | "statusServiceId"
> & {
    client: { tradeName: string };
    status: { name: string } | null;
};

export type ServiceFinderType =
    | "id"
    | "client"
    | "price"
    | "initialdate"
    | "finishdate";

export interface IServices {
    create(data: CreateServicesDatabaseInput): Promise<Services>;
    findId(id: string): Promise<Services>;
    findName(name: string): Promise<Services>;
    findValue(value: string): Promise<Services>;
    findClientServices(clientId: string): Promise<Services>;
    findInitialServiceDate(initialDate: string): Promise<Services>;
    findFinishServiceDate(finishDate: string): Promise<Services | null>;
    findHighValueByIds(
        ids: string[],
        limitNumber?: number,
        companyIds?: string[],
    ): Promise<Services[]>;
    findRecentByIds(
        ids: string[],
        limitNumber?: number,
        companyIds?: string[],
    ): Promise<Services[]>;
    findOldestByIds(
        ids: string[],
        limitNumber?: number,
        companyIds?: string[],
    ): Promise<Services[]>;
    findHighValue(limitNumber?: number, companyIds?: string[]): Promise<Services[]>;
    findRecent(limitNumber?: number, companyIds?: string[]): Promise<Services[]>;
    findOldest(limitNumber?: number, companyIds?: string[]): Promise<Services[]>;
    findAll(companyIds?: string[]): Promise<Services[]>;
    findActives(companyIds?: string[]): Promise<Services[]>;
    findActivePage(
        limit: number,
        offset: number,
        collaboratorId?: string,
        companyIds?: string[],
    ): Promise<{ list: ServicePageItem[]; total: number }>;
    findActiveByClient(clientId: string, companyIds?: string[]): Promise<Services[]>;
    findFinderPage(
        type: ServiceFinderType,
        value: string,
        limit: number,
        offset: number,
        collaboratorId?: string,
        companyIds?: string[],
    ): Promise<{ list: ServicePageItem[]; total: number }>;
    findInactives(companyIds?: string[]): Promise<Services[]>;
    editName(id: string, name: string): Promise<Services | null>;
    editPrice(id: string, price: string): Promise<Services | null>;
    editInitialDate(id: string, date: string): Promise<Services | null>;
    editFinishDate(id: string, date: string): Promise<Services | null>;
    editClient(id: string, client: string): Promise<Services | null>;
    editDetails(id: string, details: string): Promise<Services | null>;
    editStatus(id: string, status: string): Promise<Services | null>;
    updateFields(
        id: string,
        fields: Partial<CreateServicesDatabaseInput>,
    ): Promise<Services | null>;
}

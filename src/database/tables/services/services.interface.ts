import type { services } from "@/database/schema/schema";

export type CreateServicesDatabaseInput = typeof services.$inferInsert;
export type Services = typeof services.$inferSelect;

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
    ): Promise<Services[]>;
    findRecentByIds(ids: string[], limitNumber?: number): Promise<Services[]>;
    findOldestByIds(ids: string[], limitNumber?: number): Promise<Services[]>;
    findHighValue(limitNumber?: number): Promise<Services[]>;
    findRecent(limitNumber?: number): Promise<Services[]>;
    findOldest(limitNumber?: number): Promise<Services[]>;
    findAll(): Promise<Services[]>;
    findActives(): Promise<Services[]>;
    findInactives(): Promise<Services[]>;
    editName(id: string, name: string): Promise<Services | null>;
    editPrice(id: string, price: string): Promise<Services | null>;
    editInitialDate(id: string, date: string): Promise<Services | null>;
    editFinishDate(id: string, date: string): Promise<Services | null>;
    editClient(id: string, client: string): Promise<Services | null>;
    editDetails(id: string, details: string): Promise<Services | null>;
    editStatus(id: string, status: string): Promise<Services | null>;
}

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
}

import type { services } from "@/database/schema/schema";

export type CreateServicesDatabaseInput = typeof services.$inferInsert;
export type Services = typeof services.$inferSelect;

export interface IServices {
    create(data: CreateServicesDatabaseInput): Promise<Services>;
    findId(id: string): Promise<Services>;
    findName(name: string): Promise<Services>;
    findInitialServiceDate(initialDate: string): Promise<Services>;
    findFinishServiceDate(finishDate: string): Promise<Services>;
    findAll(): Promise<Services[]>;
    findActives(): Promise<Services[]>;
    findInactives(): Promise<Services[]>;
}

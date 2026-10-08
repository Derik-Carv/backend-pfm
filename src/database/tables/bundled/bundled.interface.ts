import type { bundled } from "@/database/schema/schema";

export type CreateBundledDatabaseInput = typeof bundled.$inferInsert;
export type Bundled = typeof bundled.$inferSelect;

export interface IBundled {
    create(data: CreateBundledDatabaseInput): Promise<Bundled>;
    findAll(): Promise<Bundled[]>;
    findById(id: string): Promise<Bundled | null>;
    findByUserId(userId: string): Promise<Bundled[]>;
    findByServiceId(serviceId: string): Promise<Bundled[]>;
    findName(name: string): Promise<Bundled | null>;
    findClient(client: string): Promise<Bundled | null>;
    findPrice(price: string): Promise<Bundled[]>;
    findInitialDate(initialDate: string): Promise<Bundled[]>;
    findFinishDate(finishDate: string): Promise<Bundled[]>;
    findActives(): Promise<Bundled[]>;
    findInactives(): Promise<Bundled[]>;
}

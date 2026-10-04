import type { bundled } from "@/database/schema/schema";

export type CreateBundledDatabaseInput = typeof bundled.$inferInsert;
export type Bundled = typeof bundled.$inferSelect;

export interface IBundled {
    create(data: CreateBundledDatabaseInput): Promise<Bundled>;
    findAll(): Promise<Bundled[]>;
    findById(id: string): Promise<Bundled | null>;
    findByUserId(userId: string): Promise<Bundled[]>;
    findByServiceId(serviceId: string): Promise<Bundled[]>;
    findActives(): Promise<Bundled[]>;
    findInactives(): Promise<Bundled[]>;
}

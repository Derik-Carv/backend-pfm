import type { bundled } from "@/database/schema/schema";
import type {} from "./myServices.repository";

export type CreateMyServicesDatabaseInput = typeof bundled.$inferInsert;
export type MyServices = typeof bundled.$inferSelect;

export interface IMyServices {
    create(data: CreateMyServicesDatabaseInput): Promise<MyServices>;
    findId(id: string): Promise<MyServices>;
    findIdService(id: string): Promise<MyServices>;
    findIdUser(id: string): Promise<MyServices>;
    findAll(): Promise<MyServices[]>;
    findActives(): Promise<MyServices[]>;
    findInactives(): Promise<MyServices[]>;
}

import type { statusService } from "@/database/schema/schema";

export type CreateStatusServiceDatabaseInput =
    typeof statusService.$inferInsert;
export type StatusServices = typeof statusService.$inferSelect;

export interface IStatusServices {
    create(data: CreateStatusServiceDatabaseInput): Promise<StatusServices>;
    findId(id: string): Promise<StatusServices>;
    findName(name: string): Promise<StatusServices>;
    findAll(): Promise<StatusServices[]>;
    findActives(): Promise<StatusServices[]>;
    findInactives(): Promise<StatusServices[]>;
}

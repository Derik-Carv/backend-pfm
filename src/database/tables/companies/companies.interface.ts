import { companies } from "@/database/schema/schema";

export type CreateCompanyDatabaseInput = typeof companies.$inferInsert;
export type Company = typeof companies.$inferSelect;

export type UpdateCompanyDatabaseInput = Partial<
    Pick<
        CreateCompanyDatabaseInput,
        | "registeredCompanyName"
        | "tradeName"
        | "email"
        | "phone"
        | "active"
        | "allowManualFinanceCodes"
    >
>;

export interface ICompaniesRepository {
    create(data: CreateCompanyDatabaseInput): Promise<Company>;
    findById(id: string): Promise<Company | null>;
    findByCnpj(cnpj: string): Promise<Company | null>;
    findAllMothers(): Promise<Company[]>;
    findBranchesByMotherId(motherId: string, includeInactive?: boolean): Promise<Company[]>;
    findAllActive(): Promise<Company[]>;
    updateActive(id: string, active: boolean): Promise<Company | null>;
    update(id: string, data: UpdateCompanyDatabaseInput): Promise<Company | null>;
}

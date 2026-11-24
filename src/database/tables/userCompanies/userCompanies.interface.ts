import { userCompanies } from "@/database/schema/schema";
import type { Company } from "../companies/companies.interface";

export type CreateUserCompanyDatabaseInput = typeof userCompanies.$inferInsert;
export type UserCompany = typeof userCompanies.$inferSelect;

export interface IUserCompaniesRepository {
    create(data: CreateUserCompanyDatabaseInput): Promise<UserCompany>;
    findCompaniesByUserId(userId: string): Promise<Company[]>;
    findByUserAndCompany(
        userId: string,
        companyId: string,
    ): Promise<UserCompany | null>;
    removeUserFromCompany(userId: string, companyId: string): Promise<boolean>;
}

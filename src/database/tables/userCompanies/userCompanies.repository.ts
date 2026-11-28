import { db } from "@/database/index";
import { userCompanies, companies } from "@/database/schema/schema";
import { and, eq } from "drizzle-orm";
import type { Company } from "../companies/companies.interface";
import type {
    CreateUserCompanyDatabaseInput,
    IUserCompaniesRepository,
    UserCompany,
} from "./userCompanies.interface";

export class UserCompaniesRepository implements IUserCompaniesRepository {
    async create(
        data: CreateUserCompanyDatabaseInput,
    ): Promise<UserCompany> {
        const [result] = await db.insert(userCompanies).values(data).returning();
        return result;
    }

    async findCompaniesByUserId(userId: string): Promise<Company[]> {
        const rows = await db
            .select({
                id: companies.id,
                registeredCompanyName: companies.registeredCompanyName,
                tradeName: companies.tradeName,
                cnpj: companies.cnpj,
                accountType: companies.accountType,
                allowManualFinanceCodes: companies.allowManualFinanceCodes,
                email: companies.email,
                phone: companies.phone,
                motherId: companies.motherId,
                active: companies.active,
                createdAt: companies.createdAt,
                updatedAt: companies.updatedAt,
            })
            .from(userCompanies)
            .innerJoin(companies, eq(userCompanies.companyId, companies.id))
            .where(
                and(
                    eq(userCompanies.userId, userId),
                    eq(companies.active, true),
                ),
            );

        return rows;
    }

    async findByUserAndCompany(
        userId: string,
        companyId: string,
    ): Promise<UserCompany | null> {
        const [result] = await db
            .select()
            .from(userCompanies)
            .where(
                and(
                    eq(userCompanies.userId, userId),
                    eq(userCompanies.companyId, companyId),
                ),
            )
            .limit(1);

        return result || null;
    }

    async removeUserFromCompany(
        userId: string,
        companyId: string,
    ): Promise<boolean> {
        const deleted = await db
            .delete(userCompanies)
            .where(
                and(
                    eq(userCompanies.userId, userId),
                    eq(userCompanies.companyId, companyId),
                ),
            )
            .returning();

        return deleted.length > 0;
    }
}

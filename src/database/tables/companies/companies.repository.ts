import { db } from "@/database/index";
import { companies } from "@/database/schema/schema";
import { and, eq, isNull } from "drizzle-orm";
import type {
    Company,
    CreateCompanyDatabaseInput,
    ICompaniesRepository,
    UpdateCompanyDatabaseInput,
} from "./companies.interface";

export class CompaniesRepository implements ICompaniesRepository {
    async create(data: CreateCompanyDatabaseInput): Promise<Company> {
        const [newCompany] = await db.insert(companies).values(data).returning();
        return newCompany;
    }

    async findById(id: string): Promise<Company | null> {
        const [company] = await db
            .select()
            .from(companies)
            .where(eq(companies.id, id))
            .limit(1);

        return company || null;
    }

    async findByCnpj(cnpj: string): Promise<Company | null> {
        const [company] = await db
            .select()
            .from(companies)
            .where(eq(companies.cnpj, cnpj))
            .limit(1);

        return company || null;
    }

    async findAllMothers(): Promise<Company[]> {
        return await db
            .select()
            .from(companies)
            .where(and(isNull(companies.motherId), eq(companies.active, true)));
    }

    async findBranchesByMotherId(
        motherId: string,
        includeInactive = false,
    ): Promise<Company[]> {
        const filters = [eq(companies.motherId, motherId)];
        if (!includeInactive) {
            filters.push(eq(companies.active, true));
        }
        return await db
            .select()
            .from(companies)
            .where(and(...filters));
    }

    async findAllActive(): Promise<Company[]> {
        return await db
            .select()
            .from(companies)
            .where(eq(companies.active, true));
    }

    async updateActive(id: string, active: boolean): Promise<Company | null> {
        const [updated] = await db
            .update(companies)
            .set({ active })
            .where(eq(companies.id, id))
            .returning();

        return updated || null;
    }

    async update(
        id: string,
        data: UpdateCompanyDatabaseInput,
    ): Promise<Company | null> {
        const [updated] = await db
            .update(companies)
            .set(data)
            .where(eq(companies.id, id))
            .returning();

        return updated || null;
    }
}

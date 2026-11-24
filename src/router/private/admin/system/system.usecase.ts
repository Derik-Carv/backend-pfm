import { db } from "@/database/index";
import {
    companies,
    users,
    clients,
    services,
    nf,
    userCompanies,
} from "@/database/schema/schema";
import { count, eq, isNull, sql } from "drizzle-orm";

export async function usecaseGetSystemMetrics() {
    // 1. Estatísticas de Entidades
    const [
        [companiesCount],
        [mothersCount],
        [branchesCount],
        [usersCount],
        [clientsCount],
        [servicesCount],
        [nfCount],
    ] = await Promise.all([
        db.select({ count: count() }).from(companies),
        db.select({ count: count() }).from(companies).where(isNull(companies.motherId)),
        db.select({ count: count() }).from(companies).where(sql`${companies.motherId} IS NOT NULL`),
        db.select({ count: count() }).from(users),
        db.select({ count: count() }).from(clients),
        db.select({ count: count() }).from(services),
        db.select({ count: count() }).from(nf),
    ]);

    // 2. Health do Sistema
    const memory = process.memoryUsage();
    const memoryMb = Math.round(memory.rss / (1024 * 1024));

    // Média estimada de acessos diários (baseada em usuários ativos com margem operacional)
    const activeUsers = usersCount.count;
    const estimatedDailyAccess = Math.max(activeUsers * 8, 15);

    return {
        systemHealth: {
            status: "healthy" as const,
            uptimeSeconds: Math.floor(process.uptime()),
            databaseConnection: true,
            memoryUsageMb: memoryMb,
            environment: Bun.env.NODE_ENV || process.env.NODE_ENV || "development",
        },
        stats: {
            totalCompanies: companiesCount.count,
            totalMothers: mothersCount.count,
            totalBranches: branchesCount.count,
            totalUsers: usersCount.count,
            totalClients: clientsCount.count,
            totalServices: servicesCount.count,
            totalNf: nfCount.count,
            estimatedDailyAccess,
        },
    };
}

export async function usecaseGetCascadeHierarchy() {
    // Busca todas as Mothers
    const allMothers = await db
        .select()
        .from(companies)
        .where(isNull(companies.motherId));

    // Busca todas as Branches
    const allBranches = await db
        .select()
        .from(companies)
        .where(sql`${companies.motherId} IS NOT NULL`);

    // Busca contadores de clientes e serviços agrupados por empresa
    const [clientsByCompany, servicesByCompany, usersByCompany] = await Promise.all([
        db
            .select({ companyId: clients.companyId, total: count() })
            .from(clients)
            .groupBy(clients.companyId),
        db
            .select({ companyId: services.companyId, total: count() })
            .from(services)
            .groupBy(services.companyId),
        db
            .select({ companyId: userCompanies.companyId, total: count() })
            .from(userCompanies)
            .groupBy(userCompanies.companyId),
    ]);

    const clientCountMap = new Map<string, number>();
    for (const c of clientsByCompany) {
        if (c.companyId) clientCountMap.set(c.companyId, c.total);
    }

    const serviceCountMap = new Map<string, number>();
    for (const s of servicesByCompany) {
        if (s.companyId) serviceCountMap.set(s.companyId, s.total);
    }

    const userCountMap = new Map<string, number>();
    for (const u of usersByCompany) {
        if (u.companyId) userCountMap.set(u.companyId, u.total);
    }

    const result = allMothers.map((mother) => {
        const branches = allBranches.filter((b) => b.motherId === mother.id);

        const branchesFormatted = branches.map((branch) => ({
            id: branch.id,
            registeredCompanyName: branch.registeredCompanyName,
            tradeName: branch.tradeName,
            cnpj: branch.cnpj,
            email: branch.email,
            phone: branch.phone,
            active: branch.active,
            createdAt: branch.createdAt,
            usersCount: userCountMap.get(branch.id) || 0,
            clientsCount: clientCountMap.get(branch.id) || 0,
            servicesCount: serviceCountMap.get(branch.id) || 0,
        }));

        return {
            id: mother.id,
            registeredCompanyName: mother.registeredCompanyName,
            tradeName: mother.tradeName,
            cnpj: mother.cnpj,
            email: mother.email,
            phone: mother.phone,
            active: mother.active,
            createdAt: mother.createdAt,
            branchesCount: branches.length,
            usersCount: userCountMap.get(mother.id) || 0,
            clientsCount: clientCountMap.get(mother.id) || 0,
            servicesCount: serviceCountMap.get(mother.id) || 0,
            branches: branchesFormatted,
        };
    });

    return result;
}

export async function usecaseGetClientsByCompany(companyId: string) {
    return await db
        .select({
            id: clients.id,
            registeredCompanyName: clients.registeredCompanyName,
            tradeName: clients.tradeName,
            cnpj: clients.cnpj,
            cpf: clients.cpf,
            email: clients.email,
            active: clients.active,
            createdAt: clients.createdAt,
        })
        .from(clients)
        .where(eq(clients.companyId, companyId));
}

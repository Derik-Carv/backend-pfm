import { db } from "@/database/index";
import { clients } from "@/database/schema/schema";
import { and, count, desc, eq, inArray } from "drizzle-orm";
import type {
    IClient,
    Client,
    CreateClientDatabaseInput,
} from "@/database/tables/clients/clients.interface";

export class ClientRepository implements IClient {
    async create(data: CreateClientDatabaseInput): Promise<Client> {
        const [newClient] = await db.insert(clients).values(data).returning();
        return newClient;
    }

    async findById(id: string): Promise<Client | null> {
        const [client] = await db
            .select()
            .from(clients)
            .where(eq(clients.id, id))
            .limit(1);
        return client || null;
    }

    async findByCompanyName(name: string, companyId?: string): Promise<Client | null> {
        const filters = [eq(clients.registeredCompanyName, name)];
        if (companyId) filters.push(eq(clients.companyId, companyId));
        const [client] = await db
            .select()
            .from(clients)
            .where(and(...filters))
            .limit(1);
        return client || null;
    }

    async findByTradeName(name: string, companyId?: string): Promise<Client | null> {
        const filters = [eq(clients.tradeName, name)];
        if (companyId) filters.push(eq(clients.companyId, companyId));
        const [client] = await db
            .select()
            .from(clients)
            .where(and(...filters))
            .limit(1);
        return client || null;
    }

    async findByCpf(cpf: string, companyId?: string): Promise<Client | null> {
        const filters = [eq(clients.cpf, cpf)];
        if (companyId) filters.push(eq(clients.companyId, companyId));
        const [client] = await db
            .select()
            .from(clients)
            .where(and(...filters))
            .limit(1);
        return client || null;
    }

    async findByCnpj(cnpj: string, companyId?: string): Promise<Client | null> {
        const filters = [eq(clients.cnpj, cnpj)];
        if (companyId) filters.push(eq(clients.companyId, companyId));
        const [client] = await db
            .select()
            .from(clients)
            .where(and(...filters))
            .limit(1);
        return client || null;
    }

    async findByEmail(email: string, companyId?: string): Promise<Client | null> {
        const filters = [eq(clients.email, email)];
        if (companyId) filters.push(eq(clients.companyId, companyId));
        const [client] = await db
            .select()
            .from(clients)
            .where(and(...filters))
            .limit(1);
        return client || null;
    }

    async editByCompanyName(id: string, name: string): Promise<Client | null> {
        const [client] = await db
            .update(clients)
            .set({ registeredCompanyName: name })
            .where(eq(clients.id, id))
            .returning();

        return client || null;
    }

    async editByTradeName(id: string, name: string): Promise<Client | null> {
        const [client] = await db
            .update(clients)
            .set({ tradeName: name })
            .where(eq(clients.id, id))
            .returning();

        return client || null;
    }

    async editByCnpj(id: string, cnpj: string): Promise<Client | null> {
        const [client] = await db
            .update(clients)
            .set({ cnpj: cnpj })
            .where(eq(clients.id, id))
            .returning();

        return client || null;
    }

    async editByCpf(id: string, cpf: string): Promise<Client | null> {
        const [client] = await db
            .update(clients)
            .set({ cpf: cpf })
            .where(eq(clients.id, id))
            .returning();

        return client || null;
    }

    async editByEmail(id: string, email: string): Promise<Client | null> {
        const [client] = await db
            .update(clients)
            .set({ email: email })
            .where(eq(clients.id, id))
            .returning();

        return client || null;
    }

    async editByActive(id: string, active: boolean): Promise<Client | null> {
        const [client] = await db
            .update(clients)
            .set({ active: active })
            .where(eq(clients.id, id))
            .returning();

        return client || null;
    }

    async findAll(companyIds?: string[]): Promise<Client[]> {
        if (!companyIds || companyIds.length === 0) {
            return [];
        }
        return await db
            .select()
            .from(clients)
            .where(inArray(clients.companyId, companyIds));
    }

    async findPage(
        limit: number,
        offset: number,
        companyIds?: string[],
    ): Promise<{ list: Client[]; total: number }> {
        if (!companyIds || companyIds.length === 0) {
            return { list: [], total: 0 };
        }

        const whereClause = inArray(clients.companyId, companyIds);

        const [list, [totalRow]] = await Promise.all([
            db.query.clients.findMany({
                where: whereClause,
                orderBy: (clients, { desc }) => [desc(clients.createdAt)],
                limit,
                offset,
            }),
            db.select({ count: count() }).from(clients).where(whereClause),
        ]);

        return {
            list,
            total: totalRow.count,
        };
    }

    async findPageByIds(
        ids: string[],
        limit: number,
        offset: number,
        companyIds?: string[],
    ): Promise<{ list: Client[]; total: number }> {
        if (ids.length === 0 || !companyIds || companyIds.length === 0) {
            return { list: [], total: 0 };
        }

        const whereClause = and(
            inArray(clients.id, ids),
            inArray(clients.companyId, companyIds),
        );

        const [list, [totalRow]] = await Promise.all([
            db
                .select()
                .from(clients)
                .where(whereClause)
                .orderBy(desc(clients.createdAt))
                .limit(limit)
                .offset(offset),
            db.select({ count: count() }).from(clients).where(whereClause),
        ]);

        return {
            list,
            total: totalRow.count,
        };
    }

    async findActives(companyIds?: string[]): Promise<Client[]> {
        if (!companyIds || companyIds.length === 0) {
            return [];
        }
        return await db
            .select()
            .from(clients)
            .where(and(eq(clients.active, true), inArray(clients.companyId, companyIds)));
    }

    async findInactives(companyIds?: string[]): Promise<Client[]> {
        if (!companyIds || companyIds.length === 0) {
            return [];
        }
        return await db
            .select()
            .from(clients)
            .where(and(eq(clients.active, false), inArray(clients.companyId, companyIds)));
    }
}

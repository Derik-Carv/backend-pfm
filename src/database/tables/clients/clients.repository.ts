import { db } from "@/database/index";
import { clients } from "@/database/schema/schema";
import { count, desc, eq } from "drizzle-orm";
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

    async findByCompanyName(name: string): Promise<Client | null> {
        const [client] = await db
            .select()
            .from(clients)
            .where(eq(clients.registeredCompanyName, name))
            .limit(1);
        return client || null;
    }

    async findByTradeName(name: string): Promise<Client | null> {
        const [client] = await db
            .select()
            .from(clients)
            .where(eq(clients.tradeName, name))
            .limit(1);
        return client || null;
    }

    async findByCpf(cpf: string): Promise<Client | null> {
        const [client] = await db
            .select()
            .from(clients)
            .where(eq(clients.cpf, cpf))
            .limit(1);
        return client || null;
    }

    async findByCnpj(cnpj: string): Promise<Client | null> {
        const [client] = await db
            .select()
            .from(clients)
            .where(eq(clients.cnpj, cnpj))
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

    async editByActive(id: string, active: boolean): Promise<Client | null> {
        const [client] = await db
            .update(clients)
            .set({ active: active })
            .where(eq(clients.id, id))
            .returning();

        return client || null;
    }

    async findAll(): Promise<Client[]> {
        return await db.query.clients.findMany();
    }

    async findPage(
        limit: number,
        offset: number,
    ): Promise<{ list: Client[]; total: number }> {
        const [list, [totalRow]] = await Promise.all([
            db.query.clients.findMany({
                orderBy: (clients, { desc }) => [desc(clients.createdAt)],
                limit,
                offset,
            }),
            db.select({ count: count() }).from(clients),
        ]);

        return {
            list,
            total: totalRow.count,
        };
    }

    async findActives(): Promise<Client[]> {
        return await db.select().from(clients).where(eq(clients.active, true));
    }

    async findInactives(): Promise<Client[]> {
        return await db.select().from(clients).where(eq(clients.active, false));
    }
}

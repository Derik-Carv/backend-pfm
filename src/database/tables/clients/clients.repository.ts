import { db } from "@/database/index";
import { clients } from "@/database/schema/schema";
import { eq } from "drizzle-orm";
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

    async findAll(): Promise<Client[]> {
        return await db.query.clients.findMany();
    }

    async findActives(): Promise<Client[]> {
        return await db.select().from(clients).where(eq(clients.active, true));
    }

    async findInactives(): Promise<Client[]> {
        return await db.select().from(clients).where(eq(clients.active, false));
    }
}

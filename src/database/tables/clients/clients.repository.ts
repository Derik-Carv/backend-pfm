import { db } from "@/database/index";
import { clients } from "@/database/schema/schema";
import { eq } from "drizzle-orm";

type CreateClientDatabaseInput = typeof clients.$inferInsert;

export async function getAllCLientsRepository() {
    return await db.query.clients.findMany();
}

export async function createClientRepository(data: CreateClientDatabaseInput) {
    const [newClient] = await db.insert(clients).values(data).returning();
    return newClient;
}

export async function getFindIdClientRepository(idCheck: string) {
    try {
        const [client] = await db
            .select()
            .from(clients)
            .where(eq(clients.id, idCheck))
            .limit(1);

        return client;
    } catch (err) {
        return false;
    }
}

export async function getFindCompanyNameClientRepository(nameCheck: string) {
    try {
        const [client] = await db
            .select()
            .from(clients)
            .where(eq(clients.registeredCompanyName, nameCheck))
            .limit(1);

        return client;
    } catch (err) {
        return false;
    }
}

export async function getFindTradeNameClientRepository(nameCheck: string) {
    try {
        const [client] = await db
            .select()
            .from(clients)
            .where(eq(clients.tradeName, nameCheck))
            .limit(1);

        return client;
    } catch (err) {
        return false;
    }
}

export async function getActivesClientsRepository() {
    try {
        const [client] = await db
            .select()
            .from(clients)
            .where(eq(clients.active, true));

        return client;
    } catch (err) {
        return false;
    }
}

export async function getInactivesClientsRepository() {
    try {
        const [client] = await db
            .select()
            .from(clients)
            .where(eq(clients.active, false));

        return client;
    } catch (err) {
        return false;
    }
}

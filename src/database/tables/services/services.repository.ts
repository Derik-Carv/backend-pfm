import { db } from "@/database/index";
import { services } from "@/database/schema/schema";
import { eq } from "drizzle-orm";

type CreateServiceDatabaseInput = typeof services.$inferInsert;

export async function getAllServicesRepository() {
    return await db.query.services.findMany();
}

export async function createServiceRepostiry(data: CreateServiceDatabaseInput) {
    const [newService] = await db.insert(services).values(data).returning();
    return newService;
}

export async function getFindIdServiceRepository(idCheck: string) {
    try {
        const [service] = await db
            .select()
            .from(services)
            .where(eq(services.id, idCheck))
            .limit(1);

        return service;
    } catch (err) {
        return false;
    }
}

export async function getForServiceNameRepository(serviceName: string) {
    try {
        const [service] = await db
            .select()
            .from(services)
            .where(eq(services.serviceName, serviceName))
            .limit(1);

        return service;
    } catch (err) {
        return false;
    }
}

export async function getInitialServiceDateRepository(initialDate: string) {
    try {
        const [service] = await db
            .select()
            .from(services)
            .where(eq(services.initialDate, initialDate))
            .limit(1);

        return service;
    } catch (err) {
        return false;
    }
}

export async function getFinishServiceDateRepository(finishDate: string) {
    try {
        const [service] = await db
            .select()
            .from(services)
            .where(eq(services.finishDate, finishDate))
            .limit(1);

        return service;
    } catch (err) {
        return false;
    }
}

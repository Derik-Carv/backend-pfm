import { db } from "@/database/index";
import { services } from "@/database/schema/schema";
import { eq, inArray, desc, asc } from "drizzle-orm";
import type {
    CreateServicesDatabaseInput,
    IServices,
    Services,
} from "./services.interface";

export class ServicesRepository implements IServices {
    async create(data: CreateServicesDatabaseInput): Promise<Services> {
        const [newService] = await db.insert(services).values(data).returning();
        return newService;
    }

    async findAll(): Promise<Services[]> {
        return await db.query.services.findMany();
    }

    async findId(id: string): Promise<Services> {
        const [service] = await db
            .select()
            .from(services)
            .where(eq(services.id, id))
            .limit(1);

        return service || null;
    }

    async findValue(value: string): Promise<Services> {
        const [service] = await db
            .select()
            .from(services)
            .where(eq(services.price, value));

        return service || null;
    }

    async findName(name: string): Promise<Services> {
        const [service] = await db
            .select()
            .from(services)
            .where(eq(services.serviceName, name));

        return service || null;
    }

    async findClientServices(clientId: string): Promise<Services> {
        const [service] = await db
            .select()
            .from(services)
            .where(eq(services.clientId, clientId));

        return service || null;
    }

    async findInitialServiceDate(initialDate: string): Promise<Services> {
        const [service] = await db
            .select()
            .from(services)
            .where(eq(services.initialDate, initialDate));

        return service || null;
    }

    async findFinishServiceDate(finishDate: string): Promise<Services> {
        const [service] = await db
            .select()
            .from(services)
            .where(eq(services.finishDate, finishDate));

        return service || null;
    }

    async findHighValueByIds(
        ids: string[],
        limitNumber: number = 3,
    ): Promise<Services[]> {
        if (ids.length === 0) return [];
        return await db
            .select()
            .from(services)
            .where(inArray(services.id, ids))
            .orderBy(desc(services.price))
            .limit(limitNumber);
    }

    async findRecentByIds(
        ids: string[],
        limitNumber: number = 3,
    ): Promise<Services[]> {
        if (ids.length === 0) return [];
        return await db
            .select()
            .from(services)
            .where(inArray(services.id, ids))
            .orderBy(desc(services.createdAt))
            .limit(limitNumber);
    }

    async findOldestByIds(
        ids: string[],
        limitNumber: number = 3,
    ): Promise<Services[]> {
        if (ids.length === 0) return [];
        return await db
            .select()
            .from(services)
            .where(inArray(services.id, ids))
            .orderBy(asc(services.createdAt))
            .limit(limitNumber);
    }

    async findHighValue(limitNumber: number = 3): Promise<Services[]> {
        return await db
            .select()
            .from(services)
            .orderBy(desc(services.price))
            .limit(limitNumber);
    }

    async findRecent(limitNumber: number = 3): Promise<Services[]> {
        return await db
            .select()
            .from(services)
            .orderBy(desc(services.createdAt))
            .limit(limitNumber);
    }

    async findOldest(limitNumber: number = 3): Promise<Services[]> {
        return await db
            .select()
            .from(services)
            .orderBy(asc(services.createdAt))
            .limit(limitNumber);
    }

    async findActives(): Promise<Services[]> {
        return await db
            .select()
            .from(services)
            .where(eq(services.active, true));
    }

    async findInactives(): Promise<Services[]> {
        return await db
            .select()
            .from(services)
            .where(eq(services.active, false));
    }
}

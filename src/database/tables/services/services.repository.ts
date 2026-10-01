import { db } from "@/database/index";
import { services } from "@/database/schema/schema";
import { eq } from "drizzle-orm";
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

    async findName(name: string): Promise<Services> {
        const [service] = await db
            .select()
            .from(services)
            .where(eq(services.serviceName, name))
            .limit(1);

        return service || null;
    }

    async findInitialServiceDate(initialDate: string): Promise<Services> {
        const [service] = await db
            .select()
            .from(services)
            .where(eq(services.initialDate, initialDate))
            .limit(1);

        return service || null;
    }

    async findFinishServiceDate(finishDate: string): Promise<Services> {
        const [service] = await db
            .select()
            .from(services)
            .where(eq(services.finishDate, finishDate))
            .limit(1);

        return service || null;
    }

    async findActives(): Promise<Services[]> {
        return await db
            .select()
            .from(services)
            .where(eq(services.active, true))
            .limit(1);
    }

    async findInactives(): Promise<Services[]> {
        return await db
            .select()
            .from(services)
            .where(eq(services.active, false))
            .limit(1);
    }
}

import { db } from "@/database/index";
import { bundled } from "@/database/schema/schema";
import { eq } from "drizzle-orm";
import type {
    CreateMyServicesDatabaseInput,
    IMyServices,
    MyServices,
} from "./myServices.interface";

export class MyServicesRepository implements IMyServices {
    async create(data: CreateMyServicesDatabaseInput): Promise<MyServices> {
        const [newMyServices] = await db
            .insert(bundled)
            .values(data)
            .returning();
        return newMyServices || null;
    }

    async findAll(): Promise<MyServices[]> {
        return await db.query.bundled.findMany();
    }

    async findId(id: string): Promise<MyServices> {
        const [idReturning] = await db
            .select()
            .from(bundled)
            .where(eq(bundled.id, id))
            .limit(1);
        return idReturning || null;
    }

    async findIdService(id: string): Promise<MyServices> {
        const [serviceReturning] = await db
            .select()
            .from(bundled)
            .where(eq(bundled.serviceBundledId, id));
        return serviceReturning || null;
    }

    async findIdUser(id: string): Promise<MyServices> {
        const [userReturning] = await db
            .select()
            .from(bundled)
            .where(eq(bundled.userId, id));
        return userReturning || null;
    }

    async findActives(): Promise<MyServices[]> {
        return await db.select().from(bundled).where(eq(bundled.active, true));
    }
    async findInactives(): Promise<MyServices[]> {
        return await db.select().from(bundled).where(eq(bundled.active, false));
    }
}

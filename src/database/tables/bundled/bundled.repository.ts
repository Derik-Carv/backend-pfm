import { db } from "@/database/index";
import { bundled } from "@/database/schema/schema";
import { eq } from "drizzle-orm";
import type {
    CreateBundledDatabaseInput,
    IBundled,
    Bundled,
} from "./bundled.interface";

export class BundledRepository implements IBundled {
    async create(data: CreateBundledDatabaseInput): Promise<Bundled> {
        const [newBundle] = await db.insert(bundled).values(data).returning();
        return newBundle;
    }

    async findAll(): Promise<Bundled[]> {
        return await db.query.bundled.findMany();
    }

    async findById(id: string): Promise<Bundled | null> {
        const [bundle] = await db
            .select()
            .from(bundled)
            .where(eq(bundled.id, id))
            .limit(1);

        return bundle || null;
    }

    async findByUserId(userId: string): Promise<Bundled[]> {
        return await db
            .select()
            .from(bundled)
            .where(eq(bundled.userId, userId));
    }

    async findByServiceId(serviceId: string): Promise<Bundled[]> {
        return await db
            .select()
            .from(bundled)
            .where(eq(bundled.serviceBundledId, serviceId));
    }

    async findName(name: string): Promise<Bundled | null> {
        const [bundle] = await db
            .select()
            .from(bundled)
            .where(eq(bundled.serviceNameBundled, name));

        return bundle || null;
    }

    async findClient(client: string): Promise<Bundled | null> {
        const [responseClient] = await db
            .select()
            .from(bundled)
            .where(eq(bundled.clientIdBundled, client));

        return responseClient || null;
    }

    async findPrice(price: string): Promise<Bundled[]> {
        return await db
            .select()
            .from(bundled)
            .where(eq(bundled.priceBundled, price));
    }

    async findInitialDate(initialDate: string): Promise<Bundled[]> {
        return await db
            .select()
            .from(bundled)
            .where(eq(bundled.initialDateBundled, initialDate));
    }

    async findFinishDate(finishDate: string): Promise<Bundled[]> {
        return await db
            .select()
            .from(bundled)
            .where(eq(bundled.finishDateBundled, finishDate));
    }

    async findActives(): Promise<Bundled[]> {
        return await db.select().from(bundled).where(eq(bundled.active, true));
    }

    async findInactives(): Promise<Bundled[]> {
        return await db.select().from(bundled).where(eq(bundled.active, false));
    }
}

import { db } from "@/database/index";
import { bundled, services } from "@/database/schema/schema";
import { and, count, eq, inArray, desc, asc } from "drizzle-orm";
import type {
    CreateServicesDatabaseInput,
    IServices,
    ServicePageItem,
    ServiceFinderType,
    Services,
} from "./services.interface";

export class ServicesRepository implements IServices {
    async create(data: CreateServicesDatabaseInput): Promise<Services> {
        const [newService] = await db.insert(services).values(data).returning();
        return newService;
    }

    async findActives(): Promise<Services[]> {
        return db
            .select()
            .from(services)
            .where(eq(services.active, true));
    }

    async findActivePage(
        limit: number,
        offset: number,
        collaboratorId?: string,
    ): Promise<{ list: ServicePageItem[]; total: number }> {
        const filters = [
            eq(services.active, true),
            ...(collaboratorId
                ? [
                      inArray(
                          services.id,
                          db
                              .select({
                                  serviceBundledId: bundled.serviceBundledId,
                              })
                              .from(bundled)
                              .where(eq(bundled.userId, collaboratorId)),
                      ),
                  ]
                : []),
        ];
        const where = and(...filters);
        const [list, [totalRow]] = await Promise.all([
            db.query.services.findMany({
                columns: {
                    id: true,
                    serviceName: true,
                    price: true,
                    initialDate: true,
                    finishDate: true,
                    clientId: true,
                    details: true,
                    statusServiceId: true,
                },
                with: {
                    client: {
                        columns: {
                            tradeName: true,
                        },
                    },
                    status: {
                        columns: {
                            name: true,
                        },
                    },
                },
                where,
                orderBy: (service, { desc }) => [desc(service.createdAt)],
                limit,
                offset,
            }),
            db.select({ count: count() }).from(services).where(where),
        ]);

        return {
            list,
            total: totalRow.count,
        };
    }

    async findFinderPage(
        type: ServiceFinderType,
        value: string,
        limit: number,
        offset: number,
        collaboratorId?: string,
    ): Promise<{ list: ServicePageItem[]; total: number }> {
        const searchFilter = {
            id: eq(services.id, value),
            client: eq(services.clientId, value),
            price: eq(services.price, value),
            initialdate: eq(services.initialDate, value),
            finishdate: eq(services.finishDate, value),
        }[type];
        const filters = [
            searchFilter,
            ...(collaboratorId
                ? [
                      inArray(
                          services.id,
                          db
                              .select({
                                  serviceBundledId: bundled.serviceBundledId,
                              })
                              .from(bundled)
                              .where(eq(bundled.userId, collaboratorId)),
                      ),
                  ]
                : []),
        ];
        const where = and(...filters);

        const [list, [totalRow]] = await Promise.all([
            db.query.services.findMany({
                columns: {
                    id: true,
                    serviceName: true,
                    price: true,
                    initialDate: true,
                    finishDate: true,
                    clientId: true,
                    details: true,
                    statusServiceId: true,
                },
                with: {
                    client: {
                        columns: {
                            tradeName: true,
                        },
                    },
                    status: {
                        columns: {
                            name: true,
                        },
                    },
                },
                where,
                orderBy: (service, { desc }) => [
                    desc(service.createdAt),
                    desc(service.id),
                ],
                limit,
                offset,
            }),
            db.select({ count: count() }).from(services).where(where),
        ]);

        return { list, total: totalRow.count };
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

    async findFinishServiceDate(finishDate: string): Promise<Services | null> {
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

    async findInactives(): Promise<Services[]> {
        return await db
            .select()
            .from(services)
            .where(eq(services.active, false));
    }

    async editName(id: string, name: string): Promise<Services | null> {
        const [upService] = await db
            .update(services)
            .set({ serviceName: name })
            .where(eq(services.id, id))
            .returning();

        return upService || null;
    }

    async editClient(id: string, client: string): Promise<Services | null> {
        const [upService] = await db
            .update(services)
            .set({ clientId: client })
            .where(eq(services.id, id))
            .returning();

        return upService || null;
    }

    async editDetails(id: string, details: string): Promise<Services | null> {
        const [upService] = await db
            .update(services)
            .set({ details: details })
            .where(eq(services.id, id))
            .returning();

        return upService || null;
    }

    async editPrice(id: string, price: string): Promise<Services | null> {
        const [upService] = await db
            .update(services)
            .set({ price: price })
            .where(eq(services.id, id))
            .returning();

        return upService || null;
    }

    async editStatus(id: string, status: string): Promise<Services | null> {
        const [upService] = await db
            .update(services)
            .set({ statusServiceId: status })
            .where(eq(services.id, id))
            .returning();

        return upService || null;
    }

    async editInitialDate(id: string, date: string): Promise<Services | null> {
        const [upService] = await db
            .update(services)
            .set({ initialDate: date })
            .where(eq(services.id, id))
            .returning();

        return upService || null;
    }

    async editFinishDate(id: string, date: string): Promise<Services | null> {
        const [upService] = await db
            .update(services)
            .set({ finishDate: date })
            .where(eq(services.id, id))
            .returning();

        return upService || null;
    }
}

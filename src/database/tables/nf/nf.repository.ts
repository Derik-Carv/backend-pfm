import { db } from "@/database/index";
import { nf } from "@/database/schema/schema";
import { and, count, desc, eq, gte, ilike, lte, isNotNull } from "drizzle-orm";
import type {
    CreateNfDatabaseInput,
    INF,
    NF,
    NfListFilters,
} from "./nf.interface";

export class NfRepository implements INF {
    async create(data: CreateNfDatabaseInput): Promise<NF> {
        const [newNf] = await db.insert(nf).values(data).returning();
        return newNf;
    }

    async findAll(): Promise<NF[]> {
        return await db.query.nf.findMany();
    }

    async findNfNumber(number: string): Promise<NF> {
        const [returnNf] = await db
            .select()
            .from(nf)
            .where(eq(nf.numberNf, number))
            .limit(1);

        return returnNf || null;
    }

    async findAcessKey(acessKey: string): Promise<NF> {
        const [returnKey] = await db
            .select()
            .from(nf)
            .where(eq(nf.acessKey, acessKey))
            .limit(1);

        return returnKey || null;
    }

    async findClientId(clientId: string): Promise<NF> {
        const [returnClient] = await db
            .select()
            .from(nf)
            .where(eq(nf.thirdPartyClientId, clientId))
            .limit(1);

        return returnClient || null;
    }

    async findEmissionDate(emissionDate: string): Promise<NF> {
        const [returnDate] = await db
            .select()
            .from(nf)
            .where(eq(nf.emissionDate, emissionDate));

        return returnDate || null;
    }

    async findCancelDate(cancelDate: string): Promise<NF> {
        const [returnDate] = await db
            .select()
            .from(nf)
            .where(eq(nf.cancelDate, cancelDate));

        return returnDate || null;
    }

    async findTotalValue(totalValue: string): Promise<NF> {
        const [returnValue] = await db
            .select()
            .from(nf)
            .where(eq(nf.totalValue, totalValue));

        return returnValue || null;
    }

    async findServiceId(serviceId: string): Promise<NF> {
        const [returnService] = await db
            .select()
            .from(nf)
            .where(eq(nf.servicesId, serviceId));

        return returnService || null;
    }

    async findMovimentationId(movimentationId: string): Promise<NF> {
        const [returnMovimentatation] = await db
            .select()
            .from(nf)
            .where(eq(nf.movimentationId, movimentationId));

        return returnMovimentatation || null;
    }

    async findId(id: string): Promise<NF> {
        const [returnMovimentatation] = await db
            .select()
            .from(nf)
            .where(eq(nf.id, id));

        return returnMovimentatation || null;
    }

    async findActives(): Promise<NF[]> {
        return await db.select().from(nf).where(eq(nf.active, true));
    }

    async findInactives(): Promise<NF[]> {
        return await db.select().from(nf).where(eq(nf.active, false));
    }

    async findPage(
        filters: NfListFilters,
        limit: number,
        offset: number,
    ) {
        const conditions = [];

        if (filters.noteNumber) {
            conditions.push(ilike(nf.numberNf, `%${filters.noteNumber}%`));
        }
        if (filters.accessKey) {
            conditions.push(ilike(nf.acessKey, `%${filters.accessKey}%`));
        }
        if (filters.minValue) {
            conditions.push(gte(nf.totalValue, filters.minValue));
        }
        if (filters.maxValue) {
            conditions.push(lte(nf.totalValue, filters.maxValue));
        }
        if (filters.startDate) {
            conditions.push(gte(nf.emissionDate, filters.startDate));
        }
        if (filters.endDate) {
            conditions.push(lte(nf.emissionDate, filters.endDate));
        }
        if (filters.status === "active") {
            conditions.push(eq(nf.active, true));
        } else if (filters.status === "inactive") {
            conditions.push(eq(nf.active, false));
        } else if (filters.status === "cancelled") {
            conditions.push(isNotNull(nf.cancelDate));
        }

        const where = conditions.length > 0 ? and(...conditions) : undefined;
        const [list, [totalRow]] = await Promise.all([
            db
                .select()
                .from(nf)
                .where(where)
                .orderBy(desc(nf.emissionDate), desc(nf.createdAt))
                .limit(limit)
                .offset(offset),
            db.select({ count: count() }).from(nf).where(where),
        ]);

        return { list, total: totalRow.count };
    }

    async deactivate(id: string, reason: string, userId: string) {
        const [deactivated] = await db
            .update(nf)
            .set({
                active: false,
                cancelDate: new Date().toISOString().slice(0, 10),
                deactivationReason: reason,
                deactivatedAt: new Date(),
                deactivatedBy: userId,
            })
            .where(and(eq(nf.id, id), eq(nf.active, true)))
            .returning();

        return deactivated || null;
    }
}

import { db } from "@/database/index";
import { nf } from "@/database/schema/schema";
import { eq } from "drizzle-orm";
import type { CreateNfDatabaseInput, INF, NF } from "./nf.interface";

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
            .where(eq(nf.numberNf, acessKey))
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
}

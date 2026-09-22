import { db } from "@/database/index";
import { nf } from "@/database/schema/schema";
import { eq } from "drizzle-orm";

type CreateNfDatabaseInput = typeof nf.$inferInsert;

export async function getAllNfRepository() {
    return await db.query.nf.findMany();
}

export async function createNfRepository(data: CreateNfDatabaseInput) {
    const [newNf] = await db.insert(nf).values(data).returning();
    return newNf;
}

export async function getNfNumberRepository(nfNumber: string) {
    try {
        const [returnNf] = await db
            .select()
            .from(nf)
            .where(eq(nf.numberNf, nfNumber))
            .limit(1);

        return returnNf;
    } catch (err) {
        return false;
    }
}

export async function getNfAccessKeyRepository(acessKey: string) {
    try {
        const [returnKey] = await db
            .select()
            .from(nf)
            .where(eq(nf.numberNf, acessKey))
            .limit(1);

        return returnKey;
    } catch (err) {
        return false;
    }
}

export async function getNfClientIdRepository(clientId: string) {
    try {
        const [returnClient] = await db
            .select()
            .from(nf)
            .where(eq(nf.thirdPartyClientId, clientId))
            .limit(1);

        return returnClient;
    } catch (err) {
        return false;
    }
}

export async function getNfEmissionDateRepository(emissionDate: string) {
    try {
        const [returnDate] = await db
            .select()
            .from(nf)
            .where(eq(nf.emissionDate, emissionDate));

        return returnDate;
    } catch (err) {
        return false;
    }
}

export async function getNfCancelDateRepository(cancelDate: string) {
    try {
        const [returnDate] = await db
            .select()
            .from(nf)
            .where(eq(nf.cancelDate, cancelDate));

        return returnDate;
    } catch (err) {
        return false;
    }
}

export async function getNfTotalValueRepository(totalValue: string) {
    try {
        const [returnValue] = await db
            .select()
            .from(nf)
            .where(eq(nf.totalValue, totalValue));

        return returnValue;
    } catch (err) {
        return false;
    }
}

export async function getNfForServiceIdRepository(id: string) {
    try {
        const [returnService] = await db
            .select()
            .from(nf)
            .where(eq(nf.servicesId, id));

        return returnService;
    } catch (err) {
        return false;
    }
}

export async function getNfForMovimentationIdRepository(id: string) {
    try {
        const [returnMovimentatation] = await db
            .select()
            .from(nf)
            .where(eq(nf.movimentationId, id));

        return returnMovimentatation;
    } catch (err) {
        return false;
    }
}

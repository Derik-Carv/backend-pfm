import { db } from "@/database/index";
import { movimentation } from "@/database/schema/schema";
import { eq } from "drizzle-orm";

type CreateMovimentationDatabaseInput = typeof movimentation.$inferInsert;

export async function getAllMovimentationsRepository() {
    return await db.query.movimentation.findMany();
}

export async function createNewMovimentationRepository(
    data: CreateMovimentationDatabaseInput,
) {
    const [newMovimentation] = await db
        .insert(movimentation)
        .values(data)
        .returning();
    return newMovimentation;
}

export async function getMovimentationForIdRepository(id: string) {
    try {
        const [idReturning] = await db
            .select()
            .from(movimentation)
            .where(eq(movimentation.id, id))
            .limit(1);

        return idReturning;
    } catch (err) {
        return false;
    }
}

export async function getMovimentationForNameRepository(name: string) {
    try {
        const [nameReturning] = await db
            .select()
            .from(movimentation)
            .where(eq(movimentation.name, name))
            .limit(1);

        return nameReturning;
    } catch (err) {
        return false;
    }
}

export async function getMovimentationActivesRepository() {
    try {
        const [actives] = await db
            .select()
            .from(movimentation)
            .where(eq(movimentation.active, true))
            .limit(1);

        return actives;
    } catch (err) {
        return false;
    }
}

export async function getMovimentationInactivesRepository() {
    try {
        const [inactives] = await db
            .select()
            .from(movimentation)
            .where(eq(movimentation.active, false))
            .limit(1);

        return inactives;
    } catch (err) {
        return false;
    }
}

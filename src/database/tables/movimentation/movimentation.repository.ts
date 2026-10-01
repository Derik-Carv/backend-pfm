import { db } from "@/database/index";
import { movimentation } from "@/database/schema/schema";
import { eq } from "drizzle-orm";
import type {
    CreateMovimentationDatabaseInput,
    IMovimentation,
    Movimentation,
} from "./movimentation.interface";

export class MovimentationRepository implements IMovimentation {
    async create(
        data: CreateMovimentationDatabaseInput,
    ): Promise<Movimentation> {
        const [newMovimentation] = await db
            .insert(movimentation)
            .values(data)
            .returning();
        return newMovimentation || null;
    }

    async findAll(): Promise<Movimentation[]> {
        return await db.query.movimentation.findMany();
    }

    async findId(id: string): Promise<Movimentation> {
        const [idReturning] = await db
            .select()
            .from(movimentation)
            .where(eq(movimentation.id, id))
            .limit(1);

        return idReturning || null;
    }

    async findName(name: string): Promise<Movimentation> {
        const [nameReturning] = await db
            .select()
            .from(movimentation)
            .where(eq(movimentation.name, name))
            .limit(1);

        return nameReturning || null;
    }

    async findActives(): Promise<Movimentation[]> {
        return await db
            .select()
            .from(movimentation)
            .where(eq(movimentation.active, true))
            .limit(1);
    }

    async findInactives(): Promise<Movimentation[]> {
        return await db
            .select()
            .from(movimentation)
            .where(eq(movimentation.active, false))
            .limit(1);
    }
}

import { db } from "@/database/index";
import { movimentation } from "@/database/schema/schema";
import { eq, count } from "drizzle-orm";
import type {
    CreateMovimentationDatabaseInput,
    IMovimentation,
    Movimentation,
    MovimentationPageItem,
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

    async findActivePage(
        limit: number,
        offset: number,
    ): Promise<{ list: MovimentationPageItem[]; total: number }> {
        const activeFilter = eq(movimentation.active, true);
        const [list, [totalRow]] = await Promise.all([
            db.query.movimentation.findMany({
                columns: {
                    id: true,
                    name: true,
                    nfId: true,
                    active: true,
                    destinationUserId: true,
                    destinationClientId: true,
                    justify: true,
                    createdAt: true,
                },
                with: {
                    nf: {
                        columns: {
                            numberNf: true,
                        },
                    },
                    user: {
                        columns: {
                            name: true,
                        },
                    },
                    client: {
                        columns: {
                            tradeName: true,
                        },
                    },
                },
                where: (movimentation, { eq }) =>
                    eq(movimentation.active, true),
                orderBy: (movimentation, { desc }) => [
                    desc(movimentation.createdAt),
                ],
                limit,
                offset,
            }),
            db
                .select({ count: count() })
                .from(movimentation)
                .where(activeFilter),
        ]);

        return {
            list: list as MovimentationPageItem[],
            total: totalRow.count,
        };
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
            .where(eq(movimentation.name, name));

        return nameReturning || null;
    }

    async findActives(): Promise<Movimentation[]> {
        return await db
            .select()
            .from(movimentation)
            .where(eq(movimentation.active, true));
    }

    async findInactives(): Promise<Movimentation[]> {
        return await db
            .select()
            .from(movimentation)
            .where(eq(movimentation.active, false));
    }
}

import { db } from "@/database/index";
import { statusService } from "@/database/schema/schema";
import { eq } from "drizzle-orm";

type CreateStatusServiceDatabase = typeof statusService.$inferInsert;

export async function getAllStatusServiceRepository() {
    return await db.query.statusService.findMany();
}

export async function createStatusServiceRepository(
    data: CreateStatusServiceDatabase,
) {
    const [newStatusService] = await db
        .insert(statusService)
        .values(data)
        .returning();
    return newStatusService;
}

export async function getFindIdStatusServiceRepository(idCheck: string) {
    try {
        const [statusId] = await db
            .select()
            .from(statusService)
            .where(eq(statusService.id, idCheck))
            .limit(1);

        return statusId;
    } catch (err) {
        return false;
    }
}

export async function getFindNameStatusServiceRepository(nameCheck: string) {
    try {
        const [statusName] = await db
            .select()
            .from(statusService)
            .where(eq(statusService.name, nameCheck))
            .limit(1);

        return statusName;
    } catch (err) {
        return false;
    }
}

import { db } from "@/database/index";
import { statusService } from "@/database/schema/schema";
import { eq } from "drizzle-orm";
import type {
    CreateStatusServiceDatabaseInput,
    IStatusServices,
    StatusServices,
} from "./statusService.interface";

export class StatusServiceRepository implements IStatusServices {
    async create(
        data: CreateStatusServiceDatabaseInput,
    ): Promise<StatusServices> {
        const [newStatusService] = await db
            .insert(statusService)
            .values(data)
            .returning();
        return newStatusService;
    }

    async findAll(): Promise<StatusServices[]> {
        return await db.query.statusService.findMany();
    }

    async findId(id: string): Promise<StatusServices> {
        const [statusId] = await db
            .select()
            .from(statusService)
            .where(eq(statusService.id, id))
            .limit(1);

        return statusId || null;
    }

    async findName(name: string): Promise<StatusServices> {
        const [statusName] = await db
            .select()
            .from(statusService)
            .where(eq(statusService.name, name))
            .limit(1);

        return statusName || null;
    }

    async findActives(): Promise<StatusServices[]> {
        return await db
            .select()
            .from(statusService)
            .where(eq(statusService.active, true));
    }

    async findInactives(): Promise<StatusServices[]> {
        return await db
            .select()
            .from(statusService)
            .where(eq(statusService.active, false));
    }
}

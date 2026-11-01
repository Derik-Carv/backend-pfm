import { db } from "@/database/index";
import {
    bundled,
    clients,
    movimentation,
    nf,
    roles,
    services,
    statusService,
    type,
    users,
} from "@/database/schema/schema";
import { and, count, eq } from "drizzle-orm";
import { hashPassword } from "@/lib/hash";
import type { AdminTableName } from "./adminData.types";

const tables = {
    roles,
    users,
    clients,
    movimentations: movimentation,
    types: type,
    "status-services": statusService,
    services,
    notes: nf,
    bundled,
} as const;

function tableFor(name: AdminTableName) {
    return tables[name];
}

function sanitizeRecord<T extends Record<string, unknown>>(record: T) {
    const { password: _password, ...safeRecord } = record;
    return safeRecord;
}

function preparePayload(tableName: AdminTableName, payload: Record<string, unknown>) {
    const data = { ...payload };
    delete data.id;
    delete data.createdAt;
    delete data.updatedAt;

    if (tableName === "users" && typeof data.password === "string") {
        return hashPassword(data.password).then((password) => ({
            ...data,
            password,
        }));
    }

    return Promise.resolve(data);
}

export async function listAdminRecords(
    tableName: AdminTableName,
    page: number,
    limit: number,
    status: "all" | "active" | "inactive",
) {
    const table = tableFor(tableName);
    const filters = [];

    if (status === "active") filters.push(eq(table.active, true));
    if (status === "inactive") filters.push(eq(table.active, false));

    const where = filters.length > 0 ? and(...filters) : undefined;
    const offset = (page - 1) * limit;
    const [records, [{ total }]] = await Promise.all([
        db.select().from(table).where(where).limit(limit).offset(offset),
        db.select({ total: count() }).from(table).where(where),
    ]);

    return {
        records: records.map((record) =>
            sanitizeRecord(record as unknown as Record<string, unknown>),
        ),
        total,
    };
}

export async function findAdminRecord(
    tableName: AdminTableName,
    id: string,
) {
    const table = tableFor(tableName);
    const [record] = await db
        .select()
        .from(table)
        .where(eq(table.id, id))
        .limit(1);

    return record
        ? sanitizeRecord(record as unknown as Record<string, unknown>)
        : null;
}

export async function createAdminRecord(
    tableName: AdminTableName,
    payload: Record<string, unknown>,
) {
    const table = tableFor(tableName);
    const data = await preparePayload(tableName, payload);
    const [record] = await db
        .insert(table)
        // The table is selected from a closed, validated admin table map.
        .values(data as never)
        .returning();
    return sanitizeRecord(record as unknown as Record<string, unknown>);
}

export async function updateAdminRecord(
    tableName: AdminTableName,
    id: string,
    payload: Record<string, unknown>,
) {
    const table = tableFor(tableName);
    const data = await preparePayload(tableName, payload);
    const [record] = await db
        .update(table)
        // The table is selected from a closed, validated admin table map.
        .set(data as never)
        .where(eq(table.id, id))
        .returning();

    return record
        ? sanitizeRecord(record as unknown as Record<string, unknown>)
        : null;
}

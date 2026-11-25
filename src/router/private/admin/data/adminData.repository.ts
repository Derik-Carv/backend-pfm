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
import { and, count, eq, sql } from "drizzle-orm";
import { hashPassword } from "@/lib/hash";
import { maskCpf } from "@/lib/lgpd/legal.constants";
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

const ALLOWED_WRITABLE_FIELDS: Record<AdminTableName, readonly string[]> = {
    roles: ["name", "active"],
    users: [
        "name",
        "surname",
        "username",
        "email",
        "emailVerified",
        "password",
        "roleId",
        "primaryCompanyId",
        "cpf",
        "active",
        "passwordChangeRequired",
    ],
    clients: [
        "registeredCompanyName",
        "tradeName",
        "cnpj",
        "cpf",
        "email",
        "companyId",
        "active",
    ],
    movimentations: [
        "name",
        "nfId",
        "destinationUserId",
        "destinationClientId",
        "justify",
        "companyId",
        "active",
    ],
    types: ["name", "active"],
    "status-services": ["name", "active"],
    services: [
        "serviceName",
        "price",
        "initialDate",
        "finishDate",
        "clientId",
        "details",
        "statusServiceId",
        "companyId",
        "active",
    ],
    notes: [
        "typeId",
        "numberNf",
        "acessKey",
        "thirdPartyClientId",
        "emissionDate",
        "cancelDate",
        "totalValue",
        "servicesId",
        "movimentationId",
        "companyId",
        "active",
        "deactivationReason",
    ],
    bundled: [
        "serviceBundledId",
        "userId",
        "serviceNameBundled",
        "priceBundled",
        "clientIdBundled",
        "initialDateBundled",
        "finishDateBundled",
        "active",
    ],
};

function tableFor(name: AdminTableName) {
    return tables[name];
}

function sanitizeRecord<T extends Record<string, unknown>>(record: T) {
    const { password: _password, ...safeRecord } = record;
    const mutable = safeRecord as Record<string, unknown>;
    if (typeof mutable.cpf === "string") {
        mutable.cpf = maskCpf(mutable.cpf);
    }
    return safeRecord;
}

async function preparePayload(
    tableName: AdminTableName,
    payload: Record<string, unknown>,
) {
    const allowedFields = new Set(ALLOWED_WRITABLE_FIELDS[tableName]);
    const data: Record<string, unknown> = {};

    for (const key of Object.keys(payload)) {
        if (!allowedFields.has(key)) {
            continue;
        }
        data[key] = payload[key];
    }

    if (tableName === "users" && "password" in data) {
        if (typeof data.password === "string" && data.password.trim() === "") {
            delete data.password;
        } else if (typeof data.password === "string") {
            if (data.password.length < 8 || data.password.length > 128) {
                throw new Error("INVALID_ADMIN_PASSWORD_LENGTH");
            }
            data.password = await hashPassword(data.password);
        } else {
            delete data.password;
        }
    }

    return data;
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
    const updateData =
        tableName === "users" && "password" in data
            ? { ...data, tokenVersion: sql`${users.tokenVersion} + 1` }
            : data;
    const [record] = await db
        .update(table)
        // The table is selected from a closed, validated admin table map.
        .set(updateData as never)
        .where(eq(table.id, id))
        .returning();

    return record
        ? sanitizeRecord(record as unknown as Record<string, unknown>)
        : null;
}

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/database/schema/schema";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
    throw new Error(
        "DATABASE_URL is not defined in the environment variables.",
    );
}

const parsedPoolMax = Number(process.env.DB_POOL_MAX);
const maxConnections =
    Number.isInteger(parsedPoolMax) && parsedPoolMax >= 2 && parsedPoolMax <= 50
        ? parsedPoolMax
        : 8;

const queryClient = postgres(databaseUrl, {
    max: maxConnections,
    idle_timeout: 20,
    max_lifetime: 60 * 30,
    connect_timeout: 10,
    connection: {
        statement_timeout: 15000,
    },
});

export const db = drizzle(queryClient, { schema });

export async function closeDatabase() {
    await queryClient.end({ timeout: 5 });
}

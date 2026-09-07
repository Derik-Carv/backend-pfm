import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/database/schema/schema";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
    throw new Error(
        "DATABASE_URL is not defined in the environment variables.",
    );
}

const queryClient = postgres(databaseUrl, {
    max: 10,
    idle_timeout: 30, // set the idle timeout for connections in seconds
});

export const db = drizzle(queryClient, { schema });

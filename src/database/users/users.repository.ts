import { db } from "@/database/index";
import { users } from "@/database/schema/schema";

type CreateUserDatabasaeInput = typeof users.$inferInsert;

export async function createUserRepository(data: CreateUserDatabasaeInput) {
    const [newUser] = await db.insert(users).values(data).returning();
}

// export async function getUsernameRepository(data)

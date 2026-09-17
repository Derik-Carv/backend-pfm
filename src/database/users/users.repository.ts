import { db } from "@/database/index";
import { users } from "@/database/schema/schema";
import { eq } from "drizzle-orm";

type CreateUserDatabasaeInput = typeof users.$inferInsert;

export async function createUserRepository(data: CreateUserDatabasaeInput) {
    const [newUser] = await db.insert(users).values(data).returning();
    return await newUser;
}

export async function getCompareUsernameRepository(nick: string) {
    try {
        const [user] = await db
            .select()
            .from(users)
            .where(eq(users.username, nick))
            .limit(1);

        return user;
    } catch (err) {
        return false;
    }
}

export async function getUsersRepository() {
    return await db.query.users.findMany();
}

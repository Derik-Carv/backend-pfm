import { db } from "@/database/index";
import { users } from "@/database/schema/schema";
import { eq } from "drizzle-orm";
import type {
    CreateUsersDatabaseInput,
    IUsers,
    Users,
} from "./users.interface";

export class UsersRepository implements IUsers {
    async create(data: CreateUsersDatabaseInput): Promise<Users> {
        const [newUser] = await db.insert(users).values(data).returning();
        return await newUser;
    }

    async findAll(): Promise<Users[]> {
        return await db.query.users.findMany();
    }

    async findId(id: string): Promise<Users> {
        const [user] = await db
            .select()
            .from(users)
            .where(eq(users.id, id))
            .limit(1);

        return user;
    }

    async findName(name: string): Promise<Users> {
        const [user] = await db
            .select()
            .from(users)
            .where(eq(users.name, name))
            .limit(1);

        return user || null;
    }

    async findSurname(surname: string): Promise<Users> {
        const [user] = await db
            .select()
            .from(users)
            .where(eq(users.surname, surname))
            .limit(1);

        return user || null;
    }

    async findUsername(username: string): Promise<Users> {
        const [user] = await db
            .select()
            .from(users)
            .where(eq(users.username, username))
            .limit(1);

        return user || null;
    }

    async findRoleId(roleId: string): Promise<Users> {
        const [user] = await db
            .select()
            .from(users)
            .where(eq(users.roleId, roleId))
            .limit(1);

        return user || null;
    }

    async findCpf(cpf: string): Promise<Users> {
        const [user] = await db
            .select()
            .from(users)
            .where(eq(users.cpf, cpf))
            .limit(1);

        return user || null;
    }

    async findActives(): Promise<Users[]> {
        return await db
            .select()
            .from(users)
            .where(eq(users.active, true))
            .limit(1);
    }

    async findInactives(): Promise<Users[]> {
        return await db
            .select()
            .from(users)
            .where(eq(users.active, false))
            .limit(1);
    }
}

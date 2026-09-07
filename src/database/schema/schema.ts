import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const roles = pgTable("roles", {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").unique().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const users = pgTable("users", {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    surname: text("surname").notNull(),
    username: text("username").unique().notNull(),
    roleId: uuid("role_id")
        .notNull()
        .references(() => roles.id),
    cpf: text("cpf").unique().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

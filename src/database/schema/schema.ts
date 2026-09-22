import {
    boolean,
    numeric,
    pgTable,
    text,
    timestamp,
    uuid,
    date,
    varchar,
} from "drizzle-orm/pg-core";
import { v7 as uuidv7 } from "uuid";

export const roles = pgTable("roles", {
    id: uuid("id")
        .primaryKey()
        .$defaultFn(() => uuidv7()),
    name: text("name").unique().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
        .defaultNow()
        .notNull()
        .$onUpdateFn(() => new Date()),
});

export const users = pgTable("users", {
    id: uuid("id")
        .primaryKey()
        .$defaultFn(() => uuidv7()),
    name: text("name").notNull(),
    surname: text("surname").notNull(),
    username: text("username").unique().notNull(),
    roleId: uuid("role_id")
        .notNull()
        .references(() => roles.id),
    cpf: text("cpf").unique().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
        .defaultNow()
        .notNull()
        .$onUpdateFn(() => new Date()),
});

export const clients = pgTable("clients", {
    id: uuid("id")
        .primaryKey()
        .$defaultFn(() => uuidv7()),
    registeredCompanyName: text("registered_company_name").notNull().unique(),
    tradeName: text("trade_name").notNull().unique(),
    cnpj: text("cnpj").unique(),
    cpf: text("cpf").unique(),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
        .defaultNow()
        .notNull()
        .$onUpdateFn(() => new Date()),
});

export const movimentation = pgTable("movimentation", {
    id: uuid("id")
        .primaryKey()
        .$defaultFn(() => uuidv7()),
    name: text("name").notNull(),
    nfId: uuid("nf_id"),
    destinationUserId: uuid("destination_user_id").references(() => users.id),
    destinationClientId: uuid("destination_client_id").references(
        () => clients.id,
    ),
    justify: text("justify").notNull(),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
        .defaultNow()
        .notNull()
        .$onUpdateFn(() => new Date()),
});

export const type = pgTable("type", {
    id: uuid("id")
        .primaryKey()
        .$defaultFn(() => uuidv7()),
    name: text("name").notNull(),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
        .defaultNow()
        .notNull()
        .$onUpdateFn(() => new Date()),
});

export const statusService = pgTable("statusService", {
    id: uuid("id")
        .primaryKey()
        .$defaultFn(() => uuidv7()),
    name: text("name").notNull(),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
        .defaultNow()
        .notNull()
        .$onUpdateFn(() => new Date()),
});

export const services = pgTable("services", {
    id: uuid("id")
        .primaryKey()
        .$defaultFn(() => uuidv7()),
    serviceName: text("service_name").notNull(),
    price: numeric("price", { precision: 10, scale: 2 }).notNull(),
    initialDate: date("initial_date", { mode: "string" }).notNull(),
    finishDate: date("finish_date", { mode: "string" }).notNull(),
    clientId: uuid("client_id")
        .references(() => clients.id)
        .notNull(),
    details: text("details").notNull(),
    statusServiceId: uuid("status_service_id").references(
        () => statusService.id,
    ),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
        .defaultNow()
        .notNull()
        .$onUpdateFn(() => new Date()),
});

export const nf = pgTable("nf", {
    id: uuid("id")
        .primaryKey()
        .$defaultFn(() => uuidv7()),
    typeId: uuid("type_id")
        .references(() => type.id)
        .notNull(),
    numberNf: text("number_nf"),
    acessKey: varchar("access_key", { length: 44 }).unique(),
    thirdPartyClientId: uuid("third_party_client_id")
        .references(() => clients.id)
        .notNull(),
    emissionDate: date("emission_date", { mode: "string" }).notNull(),
    cancelDate: date("cancel_date", { mode: "string" }).notNull(),
    totalValue: numeric("total_value", { precision: 10, scale: 2 }).notNull(),
    pathFile: text("path_file"),
    servicesId: uuid("services_id")
        .references(() => services.id)
        .notNull(),
    movimentationId: uuid("movimentation_id")
        .references(() => movimentation.id)
        .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
        .defaultNow()
        .notNull()
        .$onUpdateFn(() => new Date()),
});

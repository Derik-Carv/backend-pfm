import {
    boolean,
    integer,
    numeric,
    pgTable,
    text,
    timestamp,
    uuid,
    date,
    varchar,
    index,
    uniqueIndex,
} from "drizzle-orm/pg-core";
import { v7 as uuidv7 } from "uuid";
import { relations, sql } from "drizzle-orm";

export const roles = pgTable("roles", {
    id: uuid("id")
        .primaryKey()
        .$defaultFn(() => uuidv7()),
    name: text("name").unique().notNull(),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
        .defaultNow()
        .notNull()
        .$onUpdateFn(() => new Date()),
});

export const companies = pgTable(
    "companies",
    {
        id: uuid("id")
            .primaryKey()
            .$defaultFn(() => uuidv7()),
        registeredCompanyName: text("registered_company_name").notNull(),
        tradeName: text("trade_name").notNull(),
        cnpj: text("cnpj").unique().notNull(),
        email: text("email"),
        phone: text("phone"),
        motherId: uuid("mother_id").references((): any => companies.id),
        active: boolean("active").default(true).notNull(),
        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at")
            .defaultNow()
            .notNull()
            .$onUpdateFn(() => new Date()),
    },
    (table) => [
        index("companies_mother_id_idx").on(table.motherId),
        index("companies_cnpj_idx").on(table.cnpj),
        index("companies_active_idx").on(table.active),
    ],
);

export const users = pgTable(
    "users",
    {
        id: uuid("id")
            .primaryKey()
            .$defaultFn(() => uuidv7()),
        name: text("name").notNull(),
        surname: text("surname").notNull(),
        username: text("username").unique().notNull(),
        email: text("email"),
        emailVerified: boolean("email_verified").default(false).notNull(),
        password: text("password").notNull(),
        roleId: uuid("role_id")
            .notNull()
            .references(() => roles.id),
        primaryCompanyId: uuid("primary_company_id").references(
            () => companies.id,
        ),
        cpf: text("cpf").unique().notNull(),
        active: boolean("active").default(true).notNull(),
        passwordChangeRequired: boolean("password_change_required")
            .default(false)
            .notNull(),
        anonymizedAt: timestamp("anonymized_at"),
        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at")
            .defaultNow()
            .notNull()
            .$onUpdateFn(() => new Date()),
    },
    (table) => [
        uniqueIndex("users_email_lower_uidx")
            .on(sql`lower(${table.email})`)
            .where(sql`${table.email} IS NOT NULL`),
    ],
);

export const emailVerificationCodes = pgTable(
    "email_verification_codes",
    {
        id: uuid("id")
            .primaryKey()
            .$defaultFn(() => uuidv7()),
        email: text("email").notNull(),
        purpose: text("purpose").notNull(),
        codeHash: text("code_hash").notNull(),
        attempts: integer("attempts").default(0).notNull(),
        expiresAt: timestamp("expires_at").notNull(),
        consumedAt: timestamp("consumed_at"),
        createdAt: timestamp("created_at").defaultNow().notNull(),
    },
    (table) => [
        index("email_verification_codes_lookup_idx").on(
            table.email,
            table.purpose,
            table.createdAt,
        ),
    ],
);

export const companyRegistrationRequests = pgTable(
    "company_registration_requests",
    {
        id: uuid("id")
            .primaryKey()
            .$defaultFn(() => uuidv7()),
        registeredCompanyName: text("registered_company_name").notNull(),
        tradeName: text("trade_name").notNull(),
        cnpj: text("cnpj").notNull(),
        companyEmail: text("company_email"),
        phone: text("phone"),
        adminName: text("admin_name").notNull(),
        adminSurname: text("admin_surname").notNull(),
        adminEmail: text("admin_email").notNull(),
        adminCpf: text("admin_cpf").notNull(),
        adminPasswordHash: text("admin_password_hash"),
        status: text("status").default("pending").notNull(),
        rejectionReason: text("rejection_reason"),
        reviewedBy: uuid("reviewed_by").references(() => users.id),
        reviewedAt: timestamp("reviewed_at"),
        approvedCompanyId: uuid("approved_company_id").references(() => companies.id),
        approvedUserId: uuid("approved_user_id").references(() => users.id),
        acceptedTermsVersion: text("accepted_terms_version"),
        acceptedPrivacyVersion: text("accepted_privacy_version"),
        acceptedIp: text("accepted_ip"),
        acceptedAt: timestamp("accepted_at"),
        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at")
            .defaultNow()
            .notNull()
            .$onUpdateFn(() => new Date()),
    },
    (table) => [
        index("company_reg_req_status_idx").on(table.status),
        index("company_reg_req_cnpj_idx").on(table.cnpj),
        index("company_reg_req_email_idx").on(sql`lower(${table.adminEmail})`),
    ],
);

export const auditLogs = pgTable(
    "audit_logs",
    {
        id: uuid("id")
            .primaryKey()
            .$defaultFn(() => uuidv7()),
        actorId: uuid("actor_id").references(() => users.id),
        actorRole: text("actor_role"),
        companyId: uuid("company_id").references(() => companies.id),
        action: text("action").notNull(),
        targetTable: text("target_table"),
        targetId: text("target_id"),
        ipAddress: text("ip_address"),
        userAgent: text("user_agent"),
        metadata: text("metadata"),
        statusCode: integer("status_code"),
        createdAt: timestamp("created_at").defaultNow().notNull(),
    },
    (table) => [
        index("audit_logs_created_at_idx").on(table.createdAt),
        index("audit_logs_actor_idx").on(table.actorId, table.createdAt),
        index("audit_logs_company_idx").on(table.companyId, table.createdAt),
        index("audit_logs_action_idx").on(table.action),
    ],
);

export const legalAcceptances = pgTable(
    "legal_acceptances",
    {
        id: uuid("id")
            .primaryKey()
            .$defaultFn(() => uuidv7()),
        userId: uuid("user_id").references(() => users.id),
        companyRequestId: uuid("company_request_id").references(
            () => companyRegistrationRequests.id,
        ),
        documentType: text("document_type").notNull(),
        documentVersion: text("document_version").notNull(),
        ipAddress: text("ip_address"),
        userAgent: text("user_agent"),
        acceptedAt: timestamp("accepted_at").defaultNow().notNull(),
    },
    (table) => [
        index("legal_acceptances_user_doc_idx").on(
            table.userId,
            table.documentType,
            table.documentVersion,
        ),
        index("legal_acceptances_request_idx").on(table.companyRequestId),
    ],
);

export const userCompanies = pgTable(
    "user_companies",
    {
        id: uuid("id")
            .primaryKey()
            .$defaultFn(() => uuidv7()),
        userId: uuid("user_id")
            .notNull()
            .references(() => users.id),
        companyId: uuid("company_id")
            .notNull()
            .references(() => companies.id),
        isDefault: boolean("is_default").default(false).notNull(),
        createdAt: timestamp("created_at").defaultNow().notNull(),
    },
    (table) => [
        index("user_companies_user_idx").on(table.userId),
        index("user_companies_company_idx").on(table.companyId),
    ],
);

export const clients = pgTable(
    "clients",
    {
        id: uuid("id")
            .primaryKey()
            .$defaultFn(() => uuidv7()),
        companyId: uuid("company_id").references(() => companies.id),
        registeredCompanyName: text("registered_company_name").notNull(),
        tradeName: text("trade_name").notNull(),
        cnpj: text("cnpj"),
        cpf: text("cpf"),
        email: text("email"),
        active: boolean("active").default(true).notNull(),
        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at")
            .defaultNow()
            .notNull()
            .$onUpdateFn(() => new Date()),
    },
    (table) => [
        index("clients_company_id_idx").on(table.companyId),
        uniqueIndex("clients_company_registered_name_uidx").on(
            table.companyId,
            table.registeredCompanyName,
        ),
        uniqueIndex("clients_company_trade_name_uidx").on(
            table.companyId,
            table.tradeName,
        ),
        uniqueIndex("clients_company_cnpj_uidx")
            .on(table.companyId, table.cnpj)
            .where(sql`${table.cnpj} IS NOT NULL`),
        uniqueIndex("clients_company_cpf_uidx")
            .on(table.companyId, table.cpf)
            .where(sql`${table.cpf} IS NOT NULL`),
        uniqueIndex("clients_company_email_uidx")
            .on(table.companyId, table.email)
            .where(sql`${table.email} IS NOT NULL`),
    ],
);

export const movimentation = pgTable(
    "movimentation",
    {
        id: uuid("id")
            .primaryKey()
            .$defaultFn(() => uuidv7()),
        companyId: uuid("company_id").references(() => companies.id),
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
    },
    (table) => [
        index("movimentation_company_id_idx").on(table.companyId),
    ],
);

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

export const services = pgTable(
    "services",
    {
        id: uuid("id")
            .primaryKey()
            .$defaultFn(() => uuidv7()),
        companyId: uuid("company_id").references(() => companies.id),
        serviceName: text("service_name").notNull(),
        price: numeric("price", { precision: 10, scale: 2 }).notNull(),
        initialDate: date("initial_date", { mode: "string" }).notNull(),
        finishDate: date("finish_date", { mode: "string" }),
        clientId: uuid("client_id")
            .references(() => clients.id)
            .notNull(),
        details: text("details").notNull(),
        statusServiceId: uuid("status_service_id").references(
            () => statusService.id,
        ),
        active: boolean("active").default(true).notNull(),
        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at")
            .defaultNow()
            .notNull()
            .$onUpdateFn(() => new Date()),
    },
    (table) => [
        index("services_company_id_idx").on(table.companyId),
    ],
);

export const nf = pgTable(
    "nf",
    {
        id: uuid("id")
            .primaryKey()
            .$defaultFn(() => uuidv7()),
        companyId: uuid("company_id").references(() => companies.id),
        typeId: uuid("type_id")
            .references(() => type.id)
            .notNull(),
        numberNf: text("number_nf"),
        acessKey: varchar("access_key", { length: 50 }).unique(),
        thirdPartyClientId: uuid("third_party_client_id")
            .references(() => clients.id)
            .notNull(),
        emissionDate: date("emission_date", { mode: "string" }).notNull(),
        cancelDate: date("cancel_date", { mode: "string" }),
        totalValue: numeric("total_value", {
            precision: 10,
            scale: 2,
        }).notNull(),
        pathFile: text("path_file"),
        servicesId: uuid("services_id")
            .references(() => services.id)
            .notNull(),
        movimentationId: uuid("movimentation_id").references(
            () => movimentation.id,
        ),
        active: boolean("active").default(true).notNull(),
        deactivationReason: text("deactivation_reason"),
        deactivatedAt: timestamp("deactivated_at"),
        deactivatedBy: uuid("deactivated_by").references(() => users.id),
        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at")
            .defaultNow()
            .notNull()
            .$onUpdateFn(() => new Date()),
    },
    (table) => [
        index("nf_company_id_idx").on(table.companyId),
        index("nf_access_key_idx").on(table.acessKey),
        index("nf_number_idx").on(table.numberNf),
        index("nf_emission_date_idx").on(table.emissionDate),
        index("nf_active_emission_date_idx").on(
            table.active,
            table.emissionDate,
        ),
    ],
);

export const bundled = pgTable("bundled", {
    id: uuid("id")
        .primaryKey()
        .$defaultFn(() => uuidv7()),
    serviceBundledId: uuid("service_bundled_id")
        .references(() => services.id)
        .notNull(),
    userId: uuid("user_id")
        .references(() => users.id)
        .notNull(),
    serviceNameBundled: text("service_name").notNull(),
    priceBundled: numeric("price", { precision: 10, scale: 2 }).notNull(),
    clientIdBundled: text("client_bundled").notNull(),
    initialDateBundled: date("initial_date", { mode: "string" }).notNull(),
    finishDateBundled: date("finish_date", { mode: "string" }),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
        .defaultNow()
        .notNull()
        .$onUpdateFn(() => new Date()),
});

export const companiesRelations = relations(companies, ({ one, many }) => ({
    mother: one(companies, {
        fields: [companies.motherId],
        references: [companies.id],
        relationName: "branches",
    }),
    branches: many(companies, {
        relationName: "branches",
    }),
    clients: many(clients),
    services: many(services),
    movimentations: many(movimentation),
    notes: many(nf),
    userCompanies: many(userCompanies),
}));

export const userCompaniesRelations = relations(userCompanies, ({ one }) => ({
    user: one(users, {
        fields: [userCompanies.userId],
        references: [users.id],
    }),
    company: one(companies, {
        fields: [userCompanies.companyId],
        references: [companies.id],
    }),
}));

export const servicesRelations = relations(services, ({ one }) => ({
    client: one(clients, {
        fields: [services.clientId],
        references: [clients.id],
    }),
    status: one(statusService, {
        fields: [services.statusServiceId],
        references: [statusService.id],
    }),
    company: one(companies, {
        fields: [services.companyId],
        references: [companies.id],
    }),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
    role: one(roles, {
        fields: [users.roleId],
        references: [roles.id],
    }),
    primaryCompany: one(companies, {
        fields: [users.primaryCompanyId],
        references: [companies.id],
    }),
    userCompanies: many(userCompanies),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
    company: one(companies, {
        fields: [clients.companyId],
        references: [companies.id],
    }),
    services: many(services),
}));

export const movimentationRelations = relations(movimentation, ({ one }) => ({
    nf: one(nf, {
        fields: [movimentation.nfId],
        references: [nf.numberNf],
    }),
    destinationUserId: one(users, {
        fields: [movimentation.destinationUserId],
        references: [users.name],
    }),
    destinationClientId: one(clients, {
        fields: [movimentation.destinationClientId],
        references: [clients.tradeName],
    }),
    company: one(companies, {
        fields: [movimentation.companyId],
        references: [companies.id],
    }),
}));

export const nfRelations = relations(nf, ({ one }) => ({
    type: one(type, {
        fields: [nf.typeId],
        references: [type.name],
    }),
    client: one(clients, {
        fields: [nf.thirdPartyClientId],
        references: [clients.tradeName],
    }),
    service: one(services, {
        fields: [nf.servicesId],
        references: [services.serviceName],
    }),
    movimentation: one(movimentation, {
        fields: [nf.movimentationId],
        references: [movimentation.name],
    }),
    company: one(companies, {
        fields: [nf.companyId],
        references: [companies.id],
    }),
}));

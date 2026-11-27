import {
    bigint,
    boolean,
    char,
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
        tokenVersion: integer("token_version").default(1).notNull(),
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

export const securityIncidents = pgTable(
    "security_incidents",
    {
        id: uuid("id")
            .primaryKey()
            .$defaultFn(() => uuidv7()),
        title: text("title").notNull(),
        description: text("description").notNull(),
        severity: text("severity").notNull(),
        affectedDataCategories: text("affected_data_categories").notNull(),
        affectedSubjectsEstimate: integer("affected_subjects_estimate"),
        relevantRisk: boolean("relevant_risk").default(false).notNull(),
        notifiedAnpd: boolean("notified_anpd").default(false).notNull(),
        notifiedAnpdAt: timestamp("notified_anpd_at"),
        notifiedSubjects: boolean("notified_subjects").default(false).notNull(),
        notifiedSubjectsAt: timestamp("notified_subjects_at"),
        containmentMeasures: text("containment_measures"),
        status: text("status").default("open").notNull(),
        detectedAt: timestamp("detected_at").notNull(),
        reportedBy: uuid("reported_by").references(() => users.id),
        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at")
            .defaultNow()
            .notNull()
            .$onUpdateFn(() => new Date()),
    },
    (table) => [
        index("security_incidents_detected_idx").on(table.detectedAt),
        index("security_incidents_status_idx").on(table.status),
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
        anonymizedAt: timestamp("anonymized_at"),
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

export const financialAccounts = pgTable(
    "financial_accounts",
    {
        id: uuid("id")
            .primaryKey()
            .$defaultFn(() => uuidv7()),
        companyId: uuid("company_id")
            .notNull()
            .references(() => companies.id),
        name: text("name").notNull(),
        type: text("type").notNull(),
        bankCode: varchar("bank_code", { length: 10 }),
        agencyMasked: text("agency_masked"),
        accountMasked: text("account_masked"),
        initialBalanceCents: bigint("initial_balance_cents", { mode: "bigint" })
            .default(0n)
            .notNull(),
        initialBalanceDate: date("initial_balance_date", { mode: "string" }).notNull(),
        currentBalanceCents: bigint("current_balance_cents", { mode: "bigint" })
            .default(0n)
            .notNull(),
        active: boolean("active").default(true).notNull(),
        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at")
            .defaultNow()
            .notNull()
            .$onUpdateFn(() => new Date()),
    },
    (table) => [
        index("financial_accounts_company_idx").on(table.companyId),
        index("financial_accounts_company_active_idx").on(table.companyId, table.active),
    ],
);

export const financialCategories = pgTable(
    "financial_categories",
    {
        id: uuid("id")
            .primaryKey()
            .$defaultFn(() => uuidv7()),
        companyId: uuid("company_id")
            .notNull()
            .references(() => companies.id),
        parentId: uuid("parent_id").references((): any => financialCategories.id),
        code: varchar("code", { length: 30 }).notNull(),
        name: text("name").notNull(),
        kind: text("kind").notNull(),
        dreGroup: text("dre_group"),
        isSystem: boolean("is_system").default(false).notNull(),
        active: boolean("active").default(true).notNull(),
        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at")
            .defaultNow()
            .notNull()
            .$onUpdateFn(() => new Date()),
    },
    (table) => [
        index("financial_categories_company_idx").on(table.companyId),
        uniqueIndex("financial_categories_company_code_uidx").on(
            table.companyId,
            table.code,
        ),
    ],
);

export const costCenters = pgTable(
    "cost_centers",
    {
        id: uuid("id")
            .primaryKey()
            .$defaultFn(() => uuidv7()),
        companyId: uuid("company_id")
            .notNull()
            .references(() => companies.id),
        code: varchar("code", { length: 20 }).notNull(),
        name: text("name").notNull(),
        active: boolean("active").default(true).notNull(),
        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at")
            .defaultNow()
            .notNull()
            .$onUpdateFn(() => new Date()),
    },
    (table) => [
        index("cost_centers_company_idx").on(table.companyId),
        uniqueIndex("cost_centers_company_code_uidx").on(table.companyId, table.code),
    ],
);

export const financialEntries = pgTable(
    "financial_entries",
    {
        id: uuid("id")
            .primaryKey()
            .$defaultFn(() => uuidv7()),
        companyId: uuid("company_id")
            .notNull()
            .references(() => companies.id),
        entryType: text("entry_type").notNull(),
        status: text("status").notNull(),
        description: text("description").notNull(),
        documentNumber: text("document_number"),
        notes: text("notes"),
        clientId: uuid("client_id").references(() => clients.id),
        counterpartyName: text("counterparty_name"),
        counterpartyDocument: text("counterparty_document"),
        serviceId: uuid("service_id").references(() => services.id),
        nfId: uuid("nf_id").references(() => nf.id),
        categoryId: uuid("category_id")
            .notNull()
            .references(() => financialCategories.id),
        costCenterId: uuid("cost_center_id").references(() => costCenters.id),
        competenceDate: date("competence_date", { mode: "string" }).notNull(),
        issueDate: date("issue_date", { mode: "string" }).notNull(),
        dueDate: date("due_date", { mode: "string" }).notNull(),
        paidAt: timestamp("paid_at"),
        originalAmountCents: bigint("original_amount_cents", {
            mode: "bigint",
        }).notNull(),
        discountCents: bigint("discount_cents", { mode: "bigint" })
            .default(0n)
            .notNull(),
        interestCents: bigint("interest_cents", { mode: "bigint" })
            .default(0n)
            .notNull(),
        fineCents: bigint("fine_cents", { mode: "bigint" }).default(0n).notNull(),
        netAmountCents: bigint("net_amount_cents", { mode: "bigint" }).notNull(),
        settledAmountCents: bigint("settled_amount_cents", { mode: "bigint" })
            .default(0n)
            .notNull(),
        installmentNumber: integer("installment_number").default(1).notNull(),
        totalInstallments: integer("total_installments").default(1).notNull(),
        installmentGroupId: uuid("installment_group_id"),
        isIntercompany: boolean("is_intercompany").default(false).notNull(),
        counterpartyCompanyId: uuid("counterparty_company_id").references(
            () => companies.id,
        ),
        createdBy: uuid("created_by")
            .notNull()
            .references(() => users.id),
        cancelledBy: uuid("cancelled_by").references(() => users.id),
        cancelledAt: timestamp("cancelled_at"),
        cancelReason: text("cancel_reason"),
        idempotencyKey: varchar("idempotency_key", { length: 128 }),
        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at")
            .defaultNow()
            .notNull()
            .$onUpdateFn(() => new Date()),
    },
    (table) => [
        index("financial_entries_company_status_due_idx").on(
            table.companyId,
            table.entryType,
            table.status,
            table.dueDate,
        ),
        index("financial_entries_company_competence_idx").on(
            table.companyId,
            table.competenceDate,
        ),
        index("financial_entries_service_idx").on(table.serviceId),
        index("financial_entries_nf_idx").on(table.nfId),
        index("financial_entries_client_idx").on(table.clientId),
        uniqueIndex("financial_entries_company_idemp_uidx")
            .on(table.companyId, table.idempotencyKey, table.installmentNumber)
            .where(sql`${table.idempotencyKey} IS NOT NULL`),
    ],
);

export const financialSettlements = pgTable(
    "financial_settlements",
    {
        id: uuid("id")
            .primaryKey()
            .$defaultFn(() => uuidv7()),
        companyId: uuid("company_id")
            .notNull()
            .references(() => companies.id),
        entryId: uuid("entry_id")
            .notNull()
            .references(() => financialEntries.id),
        accountId: uuid("account_id")
            .notNull()
            .references(() => financialAccounts.id),
        settlementType: text("settlement_type").notNull(),
        reversedSettlementId: uuid("reversed_settlement_id").references(
            (): any => financialSettlements.id,
        ),
        paymentMethod: text("payment_method").notNull(),
        settledAt: timestamp("settled_at").notNull(),
        principalCents: bigint("principal_cents", { mode: "bigint" }).notNull(),
        interestCents: bigint("interest_cents", { mode: "bigint" })
            .default(0n)
            .notNull(),
        fineCents: bigint("fine_cents", { mode: "bigint" }).default(0n).notNull(),
        discountCents: bigint("discount_cents", { mode: "bigint" })
            .default(0n)
            .notNull(),
        gatewayFeeCents: bigint("gateway_fee_cents", { mode: "bigint" })
            .default(0n)
            .notNull(),
        totalSettledCents: bigint("total_settled_cents", { mode: "bigint" }).notNull(),
        externalProvider: text("external_provider"),
        externalTxId: text("external_tx_id"),
        idempotencyKey: varchar("idempotency_key", { length: 128 }).notNull(),
        createdBy: uuid("created_by")
            .notNull()
            .references(() => users.id),
        notes: text("notes"),
        createdAt: timestamp("created_at").defaultNow().notNull(),
    },
    (table) => [
        index("financial_settlements_company_settled_idx").on(
            table.companyId,
            table.settledAt,
        ),
        index("financial_settlements_entry_idx").on(table.entryId),
        index("financial_settlements_account_idx").on(table.accountId),
        uniqueIndex("financial_settlements_reversed_uidx")
            .on(table.reversedSettlementId)
            .where(sql`${table.reversedSettlementId} IS NOT NULL`),
        uniqueIndex("financial_settlements_company_idemp_uidx").on(
            table.companyId,
            table.idempotencyKey,
        ),
    ],
);

export const financialIdempotencyKeys = pgTable(
    "financial_idempotency_keys",
    {
        id: uuid("id")
            .primaryKey()
            .$defaultFn(() => uuidv7()),
        companyId: uuid("company_id")
            .notNull()
            .references(() => companies.id),
        endpoint: text("endpoint").notNull(),
        idempotencyKey: varchar("idempotency_key", { length: 128 }).notNull(),
        requestHash: char("request_hash", { length: 64 }).notNull(),
        responseStatus: integer("response_status").notNull(),
        responseBody: text("response_body").notNull(),
        createdBy: uuid("created_by")
            .notNull()
            .references(() => users.id),
        createdAt: timestamp("created_at").defaultNow().notNull(),
    },
    (table) => [
        uniqueIndex("financial_idempotency_keys_scope_uidx").on(
            table.companyId,
            table.endpoint,
            table.idempotencyKey,
        ),
        index("financial_idempotency_keys_created_idx").on(table.createdAt),
    ],
);

export const financialEntriesRelations = relations(financialEntries, ({ one, many }) => ({
    company: one(companies, {
        fields: [financialEntries.companyId],
        references: [companies.id],
    }),
    client: one(clients, {
        fields: [financialEntries.clientId],
        references: [clients.id],
    }),
    service: one(services, {
        fields: [financialEntries.serviceId],
        references: [services.id],
    }),
    nf: one(nf, {
        fields: [financialEntries.nfId],
        references: [nf.id],
    }),
    category: one(financialCategories, {
        fields: [financialEntries.categoryId],
        references: [financialCategories.id],
    }),
    costCenter: one(costCenters, {
        fields: [financialEntries.costCenterId],
        references: [costCenters.id],
    }),
    settlements: many(financialSettlements),
}));

export const financialSettlementsRelations = relations(financialSettlements, ({ one }) => ({
    entry: one(financialEntries, {
        fields: [financialSettlements.entryId],
        references: [financialEntries.id],
    }),
    account: one(financialAccounts, {
        fields: [financialSettlements.accountId],
        references: [financialAccounts.id],
    }),
}));

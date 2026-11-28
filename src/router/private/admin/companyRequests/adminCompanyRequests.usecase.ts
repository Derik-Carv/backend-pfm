import { db } from "@/database/index";
import {
    companies,
    companyRegistrationRequests,
    legalAcceptances,
    roles,
    userCompanies,
    users,
} from "@/database/schema/schema";
import { maskCpf } from "@/lib/lgpd/legal.constants";
import { maskTenantDocument } from "@/utils/checkCnpj";
import { sendCompanyRequestDecisionEmail } from "@/lib/nodemailer/nodemailer";
import { resolveUniqueUsername, serializeCompanySafe } from "@/router/private/companies/companies.usecase";
import { slugifyCompanyName } from "@/utils/createNick";
import { and, desc, eq, sql } from "drizzle-orm";

const safeRequestColumns = {
    id: companyRegistrationRequests.id,
    accountType: companyRegistrationRequests.accountType,
    registeredCompanyName: companyRegistrationRequests.registeredCompanyName,
    tradeName: companyRegistrationRequests.tradeName,
    cnpj: companyRegistrationRequests.cnpj,
    companyEmail: companyRegistrationRequests.companyEmail,
    phone: companyRegistrationRequests.phone,
    adminName: companyRegistrationRequests.adminName,
    adminSurname: companyRegistrationRequests.adminSurname,
    adminEmail: companyRegistrationRequests.adminEmail,
    adminCpf: companyRegistrationRequests.adminCpf,
    status: companyRegistrationRequests.status,
    rejectionReason: companyRegistrationRequests.rejectionReason,
    reviewedBy: companyRegistrationRequests.reviewedBy,
    reviewedAt: companyRegistrationRequests.reviewedAt,
    approvedCompanyId: companyRegistrationRequests.approvedCompanyId,
    approvedUserId: companyRegistrationRequests.approvedUserId,
    createdAt: companyRegistrationRequests.createdAt,
    updatedAt: companyRegistrationRequests.updatedAt,
};

export async function usecaseListCompanyRequests(
    status: "pending" | "approved" | "rejected" | "all",
) {
    const whereClause =
        status === "all"
            ? undefined
            : eq(companyRegistrationRequests.status, status);

    const rows = await db
        .select(safeRequestColumns)
        .from(companyRegistrationRequests)
        .where(whereClause)
        .orderBy(desc(companyRegistrationRequests.createdAt));

    return rows.map((row) => ({
        ...row,
        accountType:
            row.accountType === "personal"
                ? ("personal" as const)
                : ("business" as const),
        cnpj: maskTenantDocument(row.cnpj, row.accountType),
        adminCpf: maskCpf(row.adminCpf),
    }));
}

export async function usecaseApproveCompanyRequest(
    requestId: string,
    reviewerUserId: string,
) {
    const [reqRecord] = await db
        .select()
        .from(companyRegistrationRequests)
        .where(eq(companyRegistrationRequests.id, requestId))
        .limit(1);

    if (!reqRecord) {
        throw new Error("REQUEST_NOT_FOUND");
    }

    if (reqRecord.status !== "pending" || !reqRecord.adminPasswordHash) {
        throw new Error("REQUEST_ALREADY_REVIEWED");
    }

    const adminPasswordHash = reqRecord.adminPasswordHash;

    const [existingCompany] = await db
        .select({ id: companies.id })
        .from(companies)
        .where(eq(companies.cnpj, reqRecord.cnpj))
        .limit(1);
    if (existingCompany) {
        throw new Error("COMPANY_CNPJ_ALREADY_EXISTS");
    }

    const [existingByEmail] = await db
        .select({ id: users.id })
        .from(users)
        .where(sql`lower(${users.email}) = ${reqRecord.adminEmail.toLowerCase()}`)
        .limit(1);
    if (existingByEmail) {
        throw new Error("EMAIL_ALREADY_EXISTS");
    }

    const [existingByCpf] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.cpf, reqRecord.adminCpf))
        .limit(1);
    if (existingByCpf) {
        throw new Error("CPF_ALREADY_EXISTS");
    }

    const [companyAdminRole] = await db
        .select({ id: roles.id })
        .from(roles)
        .where(and(eq(roles.name, "company_admin"), eq(roles.active, true)))
        .limit(1);
    if (!companyAdminRole) {
        throw new Error("ROLE_NOT_FOUND");
    }

    const generatedUsername = await resolveUniqueUsername(
        `administrator.${slugifyCompanyName(reqRecord.tradeName)}`,
        false,
    );

    const result = await db.transaction(async (tx) => {
        const [newCompany] = await tx
            .insert(companies)
            .values({
                registeredCompanyName: reqRecord.registeredCompanyName,
                tradeName: reqRecord.tradeName,
                cnpj: reqRecord.cnpj,
                accountType:
                    reqRecord.accountType === "personal" ? "personal" : "business",
                email: reqRecord.companyEmail ?? reqRecord.adminEmail,
                phone: reqRecord.phone,
                motherId: null,
                active: true,
            })
            .returning();

        const [createdAdmin] = await tx
            .insert(users)
            .values({
                name: reqRecord.adminName,
                surname: reqRecord.adminSurname,
                username: generatedUsername,
                email: reqRecord.adminEmail.toLowerCase(),
                emailVerified: true,
                password: adminPasswordHash,
                roleId: companyAdminRole.id,
                primaryCompanyId: newCompany.id,
                cpf: reqRecord.adminCpf,
                active: true,
                passwordChangeRequired: false,
            })
            .returning({
                id: users.id,
                username: users.username,
                email: users.email,
            });

        await tx.insert(userCompanies).values({
            userId: createdAdmin.id,
            companyId: newCompany.id,
            isDefault: true,
        });

        await tx
            .update(legalAcceptances)
            .set({ userId: createdAdmin.id })
            .where(eq(legalAcceptances.companyRequestId, requestId));

        const [claimed] = await tx
            .update(companyRegistrationRequests)
            .set({
                status: "approved",
                adminPasswordHash: null,
                reviewedBy: reviewerUserId,
                reviewedAt: new Date(),
                approvedCompanyId: newCompany.id,
                approvedUserId: createdAdmin.id,
            })
            .where(
                and(
                    eq(companyRegistrationRequests.id, requestId),
                    eq(companyRegistrationRequests.status, "pending"),
                ),
            )
            .returning({ id: companyRegistrationRequests.id });

        if (!claimed) {
            throw new Error("REQUEST_ALREADY_REVIEWED");
        }

        return {
            company: serializeCompanySafe(newCompany),
            adminUser: {
                id: createdAdmin.id,
                username: createdAdmin.username,
                email: createdAdmin.email ?? reqRecord.adminEmail,
                role: "company_admin",
            },
        };
    });

    void sendCompanyRequestDecisionEmail({
        to: reqRecord.adminEmail,
        companyName: result.company.tradeName,
        adminName: reqRecord.adminName,
        decision: "approved",
        username: result.adminUser.username,
    });

    return result;
}

export async function usecaseRejectCompanyRequest(
    requestId: string,
    reason: string,
    reviewerUserId: string,
) {
    const [reqRecord] = await db
        .select()
        .from(companyRegistrationRequests)
        .where(eq(companyRegistrationRequests.id, requestId))
        .limit(1);

    if (!reqRecord) {
        throw new Error("REQUEST_NOT_FOUND");
    }

    if (reqRecord.status !== "pending") {
        throw new Error("REQUEST_ALREADY_REVIEWED");
    }

    const [updated] = await db
        .update(companyRegistrationRequests)
        .set({
            status: "rejected",
            rejectionReason: reason,
            adminPasswordHash: null,
            reviewedBy: reviewerUserId,
            reviewedAt: new Date(),
        })
        .where(
            and(
                eq(companyRegistrationRequests.id, requestId),
                eq(companyRegistrationRequests.status, "pending"),
            ),
        )
        .returning(safeRequestColumns);

    if (!updated) {
        throw new Error("REQUEST_ALREADY_REVIEWED");
    }

    void sendCompanyRequestDecisionEmail({
        to: reqRecord.adminEmail,
        companyName: reqRecord.tradeName,
        adminName: reqRecord.adminName,
        decision: "rejected",
        reason,
    });

    return {
        ...updated,
        accountType:
            updated.accountType === "personal"
                ? ("personal" as const)
                : ("business" as const),
        cnpj: maskTenantDocument(updated.cnpj, updated.accountType),
        adminCpf: maskCpf(updated.adminCpf),
    };
}

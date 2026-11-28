import { db } from "@/database/index";
import {
    companies,
    companyRegistrationRequests,
    legalAcceptances,
    roles,
    userCompanies,
    users,
} from "@/database/schema/schema";
import { ensureDefaultFinancialCategories } from "@/lib/finance/defaultCategories";
import {
    LEGAL_PRIVACY_VERSION,
    LEGAL_TERMS_VERSION,
} from "@/lib/lgpd/legal.constants";
import {
    EmailVerificationCodesRepository,
    generateSixDigitCode,
} from "@/database/tables/emailVerificationCodes/emailVerificationCodes.repository";
import { hashPassword } from "@/lib/hash";
import {
    sendCompanyRequestDecisionEmail,
    sendVerificationCodeEmail,
} from "@/lib/nodemailer/nodemailer";
import { resolveUniqueUsername } from "@/router/private/companies/companies.usecase";
import { cnpjClean, cnpjValidate, maskTenantDocument } from "@/utils/checkCnpj";
import { cpfClean, cpfValidateNormal } from "@/utils/checkCpf";
import { slugifyCompanyName } from "@/utils/createNick";
import { and, eq, sql } from "drizzle-orm";
import type {
    CreateCompanyRequestInput,
    RequestCompanyCodeInput,
} from "./companyRequests.schemas";

const UNIFORM_COMPANY_CODE_RESPONSE = {
    message:
        "Se os dados informados estiverem disponíveis para solicitação, você receberá um código de verificação por e-mail em instantes.",
    expiresInMinutes: 15,
};

export async function usecaseRequestCompanyCode(data: RequestCompanyCodeInput) {
    if (data.accountType === "personal" && data.cpf) {
        const cleanedCpf = cpfClean(data.cpf);
        if (!(await cpfValidateNormal(cleanedCpf))) {
            throw new Error("INVALID_CPF");
        }
    }

    if (data.accountType === "business" && data.cnpj) {
        const cleanedCnpj = cnpjClean(data.cnpj);
        if (!cnpjValidate(cleanedCnpj)) {
            throw new Error("INVALID_CNPJ");
        }
    }

    const [existingUserByEmail] = await db
        .select({ id: users.id })
        .from(users)
        .where(sql`lower(${users.email}) = ${data.email}`)
        .limit(1);
    if (existingUserByEmail) {
        return UNIFORM_COMPANY_CODE_RESPONSE;
    }

    const [pendingEmailReq] = await db
        .select({ id: companyRegistrationRequests.id })
        .from(companyRegistrationRequests)
        .where(
            and(
                sql`lower(${companyRegistrationRequests.adminEmail}) = ${data.email}`,
                eq(companyRegistrationRequests.status, "pending"),
            ),
        )
        .limit(1);
    if (pendingEmailReq) {
        return UNIFORM_COMPANY_CODE_RESPONSE;
    }

    if (data.accountType === "personal" && data.cpf) {
        const cleanedCpf = cpfClean(data.cpf);
        if (cleanedCpf.length === 11) {
            const [existingUserByCpf] = await db
                .select({ id: users.id })
                .from(users)
                .where(eq(users.cpf, cleanedCpf))
                .limit(1);
            if (existingUserByCpf) {
                return UNIFORM_COMPANY_CODE_RESPONSE;
            }

            const [existingPersonalTenant] = await db
                .select({ id: companies.id })
                .from(companies)
                .where(eq(companies.cnpj, cleanedCpf))
                .limit(1);
            if (existingPersonalTenant) {
                return UNIFORM_COMPANY_CODE_RESPONSE;
            }

            const [pendingCpfReq] = await db
                .select({ id: companyRegistrationRequests.id })
                .from(companyRegistrationRequests)
                .where(
                    and(
                        eq(companyRegistrationRequests.adminCpf, cleanedCpf),
                        eq(companyRegistrationRequests.status, "pending"),
                    ),
                )
                .limit(1);
            if (pendingCpfReq) {
                return UNIFORM_COMPANY_CODE_RESPONSE;
            }
        }
    }

    if (data.accountType === "business" && data.cnpj) {
        const cleanedCnpj = cnpjClean(data.cnpj);
        if (cleanedCnpj.length === 14) {
            const [existingCompany] = await db
                .select({ id: companies.id })
                .from(companies)
                .where(eq(companies.cnpj, cleanedCnpj))
                .limit(1);
            if (existingCompany) {
                return UNIFORM_COMPANY_CODE_RESPONSE;
            }

            const [pendingCnpjReq] = await db
                .select({ id: companyRegistrationRequests.id })
                .from(companyRegistrationRequests)
                .where(
                    and(
                        eq(companyRegistrationRequests.cnpj, cleanedCnpj),
                        eq(companyRegistrationRequests.status, "pending"),
                    ),
                )
                .limit(1);
            if (pendingCnpjReq) {
                return UNIFORM_COMPANY_CODE_RESPONSE;
            }
        }
    }

    const code = generateSixDigitCode();
    const codesRepo = new EmailVerificationCodesRepository();
    try {
        await codesRepo.createCode(data.email, "company_register", code, 15);
    } catch (error) {
        if (error instanceof Error && error.message === "OTP_COOLDOWN_ACTIVE") {
            return UNIFORM_COMPANY_CODE_RESPONSE;
        }
        throw error;
    }

    await sendVerificationCodeEmail({
        to: data.email,
        code,
        purpose: "company_register",
        recipientName: data.name,
    });

    return UNIFORM_COMPANY_CODE_RESPONSE;
}

export async function usecaseCreateCompanyRequest(
    data: CreateCompanyRequestInput,
    meta: { ipAddress: string | null; userAgent: string | null } = {
        ipAddress: null,
        userAgent: null,
    },
) {
    const validCpf = await cpfValidateNormal(data.adminCpf);
    if (!validCpf) {
        throw new Error("INVALID_CPF");
    }

    const accountType = data.accountType;
    const isPersonal = accountType === "personal";

    if (!isPersonal) {
        if (!data.cnpj || !cnpjValidate(data.cnpj)) {
            throw new Error("INVALID_CNPJ");
        }
    }

    const tenantDocument = isPersonal ? data.adminCpf : data.cnpj!;
    const fullName = `${data.adminName} ${data.adminSurname}`.trim();
    const resolvedRegisteredName = isPersonal
        ? fullName
        : data.registeredCompanyName!;
    const resolvedTradeName = isPersonal
        ? data.tradeName || fullName
        : data.tradeName!;

    const codesRepo = new EmailVerificationCodesRepository();
    const verification = await codesRepo.verifyAndConsumeCode(
        data.adminEmail,
        "company_register",
        data.code,
    );
    if (!verification.ok) {
        throw new Error("INVALID_OR_EXPIRED_CODE");
    }

    const [existingCompany] = await db
        .select({ id: companies.id })
        .from(companies)
        .where(eq(companies.cnpj, tenantDocument))
        .limit(1);
    if (existingCompany) {
        throw new Error(
            isPersonal ? "CPF_ALREADY_EXISTS" : "COMPANY_CNPJ_ALREADY_EXISTS",
        );
    }

    const [pendingDocReq] = await db
        .select({ id: companyRegistrationRequests.id })
        .from(companyRegistrationRequests)
        .where(
            and(
                eq(companyRegistrationRequests.cnpj, tenantDocument),
                eq(companyRegistrationRequests.status, "pending"),
            ),
        )
        .limit(1);
    if (pendingDocReq) {
        throw new Error("REQUEST_ALREADY_PENDING");
    }

    const [existingUserByEmail] = await db
        .select({ id: users.id })
        .from(users)
        .where(sql`lower(${users.email}) = ${data.adminEmail}`)
        .limit(1);
    if (existingUserByEmail) {
        throw new Error("EMAIL_ALREADY_EXISTS");
    }

    const [pendingEmailReq] = await db
        .select({ id: companyRegistrationRequests.id })
        .from(companyRegistrationRequests)
        .where(
            and(
                sql`lower(${companyRegistrationRequests.adminEmail}) = ${data.adminEmail}`,
                eq(companyRegistrationRequests.status, "pending"),
            ),
        )
        .limit(1);
    if (pendingEmailReq) {
        throw new Error("REQUEST_ALREADY_PENDING");
    }

    const [existingUserByCpf] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.cpf, data.adminCpf))
        .limit(1);
    if (existingUserByCpf) {
        throw new Error("CPF_ALREADY_EXISTS");
    }

    const [pendingCpfReq] = await db
        .select({ id: companyRegistrationRequests.id })
        .from(companyRegistrationRequests)
        .where(
            and(
                eq(companyRegistrationRequests.adminCpf, data.adminCpf),
                eq(companyRegistrationRequests.status, "pending"),
            ),
        )
        .limit(1);
    if (pendingCpfReq) {
        throw new Error("REQUEST_ALREADY_PENDING");
    }

    const adminPasswordHash = await hashPassword(data.adminPassword);
    const acceptedAt = new Date();

    if (isPersonal) {
        const [companyAdminRole] = await db
            .select({ id: roles.id })
            .from(roles)
            .where(and(eq(roles.name, "company_admin"), eq(roles.active, true)))
            .limit(1);
        if (!companyAdminRole) {
            throw new Error("ROLE_NOT_FOUND");
        }

        const slugBase = slugifyCompanyName(resolvedTradeName) || "pessoal";
        const generatedUsername = await resolveUniqueUsername(
            `pessoal.${slugBase}`,
            false,
        );

        let created;
        try {
            created = await db.transaction(async (tx) => {
                const [newCompany] = await tx
                    .insert(companies)
                    .values({
                        registeredCompanyName: resolvedRegisteredName,
                        tradeName: resolvedTradeName,
                        cnpj: tenantDocument,
                        accountType: "personal",
                        email: data.adminEmail,
                        phone: data.phone ?? null,
                        motherId: null,
                        active: true,
                    })
                    .returning();

                const [createdUser] = await tx
                    .insert(users)
                    .values({
                        name: data.adminName,
                        surname: data.adminSurname,
                        username: generatedUsername,
                        email: data.adminEmail.toLowerCase(),
                        emailVerified: true,
                        password: adminPasswordHash,
                        roleId: companyAdminRole.id,
                        primaryCompanyId: newCompany.id,
                        cpf: data.adminCpf,
                        active: true,
                        passwordChangeRequired: false,
                    })
                    .returning({
                        id: users.id,
                        username: users.username,
                    });

                await tx.insert(userCompanies).values({
                    userId: createdUser.id,
                    companyId: newCompany.id,
                    isDefault: true,
                });

                await ensureDefaultFinancialCategories(newCompany.id, tx, "personal");

                const [reqRow] = await tx
                    .insert(companyRegistrationRequests)
                    .values({
                        accountType: "personal",
                        registeredCompanyName: resolvedRegisteredName,
                        tradeName: resolvedTradeName,
                        cnpj: tenantDocument,
                        companyEmail: data.adminEmail,
                        phone: data.phone ?? null,
                        adminName: data.adminName,
                        adminSurname: data.adminSurname,
                        adminEmail: data.adminEmail,
                        adminCpf: data.adminCpf,
                        adminPasswordHash: null,
                        status: "approved",
                        reviewedAt: acceptedAt,
                        approvedCompanyId: newCompany.id,
                        approvedUserId: createdUser.id,
                        acceptedTermsVersion: LEGAL_TERMS_VERSION,
                        acceptedPrivacyVersion: LEGAL_PRIVACY_VERSION,
                        acceptedIp: meta.ipAddress,
                        acceptedAt,
                    })
                    .returning({
                        id: companyRegistrationRequests.id,
                        accountType: companyRegistrationRequests.accountType,
                        registeredCompanyName:
                            companyRegistrationRequests.registeredCompanyName,
                        tradeName: companyRegistrationRequests.tradeName,
                        cnpj: companyRegistrationRequests.cnpj,
                        adminName: companyRegistrationRequests.adminName,
                        adminSurname: companyRegistrationRequests.adminSurname,
                        adminEmail: companyRegistrationRequests.adminEmail,
                        status: companyRegistrationRequests.status,
                        createdAt: companyRegistrationRequests.createdAt,
                    });

                await tx.insert(legalAcceptances).values([
                    {
                        userId: createdUser.id,
                        companyRequestId: reqRow.id,
                        documentType: "terms_of_use",
                        documentVersion: LEGAL_TERMS_VERSION,
                        ipAddress: meta.ipAddress,
                        userAgent: meta.userAgent,
                        acceptedAt,
                    },
                    {
                        userId: createdUser.id,
                        companyRequestId: reqRow.id,
                        documentType: "privacy_policy",
                        documentVersion: LEGAL_PRIVACY_VERSION,
                        ipAddress: meta.ipAddress,
                        userAgent: meta.userAgent,
                        acceptedAt,
                    },
                ]);

                return {
                    autoApproved: true,
                    username: createdUser.username,
                    request: {
                        ...reqRow,
                        accountType: "personal" as const,
                        cnpj: maskTenantDocument(reqRow.cnpj, "personal"),
                    },
                };
            });
        } catch (err) {
            const pgErr = err as {
                code?: string;
                constraint_name?: string;
                constraint?: string;
                cause?: { code?: string; constraint_name?: string; constraint?: string };
            };
            const pgCode = pgErr?.code ?? pgErr?.cause?.code;
            const pgConstraint = String(
                pgErr?.constraint_name ??
                    pgErr?.constraint ??
                    pgErr?.cause?.constraint_name ??
                    pgErr?.cause?.constraint ??
                    "",
            ).toLowerCase();
            if (pgCode === "23505") {
                if (pgConstraint.includes("email")) {
                    throw new Error("EMAIL_ALREADY_EXISTS");
                }
                if (pgConstraint.includes("cpf") || pgConstraint.includes("cnpj")) {
                    throw new Error("CPF_ALREADY_EXISTS");
                }
                throw new Error("REQUEST_ALREADY_PENDING");
            }
            throw err;
        }

        void sendCompanyRequestDecisionEmail({
            to: created.request.adminEmail,
            companyName: created.request.tradeName,
            adminName: created.request.adminName,
            decision: "approved",
            username: created.username,
        });

        return created;
    }

    const created = await db.transaction(async (tx) => {
        const [reqRow] = await tx
            .insert(companyRegistrationRequests)
            .values({
                accountType: "business",
                registeredCompanyName: resolvedRegisteredName,
                tradeName: resolvedTradeName,
                cnpj: tenantDocument,
                companyEmail: data.companyEmail ?? null,
                phone: data.phone ?? null,
                adminName: data.adminName,
                adminSurname: data.adminSurname,
                adminEmail: data.adminEmail,
                adminCpf: data.adminCpf,
                adminPasswordHash,
                status: "pending",
                acceptedTermsVersion: LEGAL_TERMS_VERSION,
                acceptedPrivacyVersion: LEGAL_PRIVACY_VERSION,
                acceptedIp: meta.ipAddress,
                acceptedAt,
            })
            .returning({
                id: companyRegistrationRequests.id,
                accountType: companyRegistrationRequests.accountType,
                registeredCompanyName:
                    companyRegistrationRequests.registeredCompanyName,
                tradeName: companyRegistrationRequests.tradeName,
                cnpj: companyRegistrationRequests.cnpj,
                adminName: companyRegistrationRequests.adminName,
                adminSurname: companyRegistrationRequests.adminSurname,
                adminEmail: companyRegistrationRequests.adminEmail,
                status: companyRegistrationRequests.status,
                createdAt: companyRegistrationRequests.createdAt,
            });

        await tx.insert(legalAcceptances).values([
            {
                companyRequestId: reqRow.id,
                documentType: "terms_of_use",
                documentVersion: LEGAL_TERMS_VERSION,
                ipAddress: meta.ipAddress,
                userAgent: meta.userAgent,
                acceptedAt,
            },
            {
                companyRequestId: reqRow.id,
                documentType: "privacy_policy",
                documentVersion: LEGAL_PRIVACY_VERSION,
                ipAddress: meta.ipAddress,
                userAgent: meta.userAgent,
                acceptedAt,
            },
        ]);

        return {
            autoApproved: false,
            request: {
                ...reqRow,
                accountType: "business" as const,
            },
        };
    });

    void sendCompanyRequestDecisionEmail({
        to: created.request.adminEmail,
        companyName: created.request.tradeName,
        adminName: created.request.adminName,
        decision: "received",
    });

    return created;
}

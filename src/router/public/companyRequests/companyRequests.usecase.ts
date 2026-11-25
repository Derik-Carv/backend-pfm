import { db } from "@/database/index";
import {
    companies,
    companyRegistrationRequests,
    legalAcceptances,
    users,
} from "@/database/schema/schema";
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
import { cpfValidateNormal } from "@/utils/checkCpf";
import { and, eq, sql } from "drizzle-orm";
import type {
    CreateCompanyRequestInput,
    RequestCompanyCodeInput,
} from "./companyRequests.schemas";

export async function usecaseRequestCompanyCode(data: RequestCompanyCodeInput) {
    const [existingUserByEmail] = await db
        .select({ id: users.id })
        .from(users)
        .where(sql`lower(${users.email}) = ${data.email}`)
        .limit(1);
    if (existingUserByEmail) {
        throw new Error("EMAIL_ALREADY_EXISTS");
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
        throw new Error("REQUEST_ALREADY_PENDING");
    }

    if (data.cnpj) {
        const cleanedCnpj = data.cnpj.replace(/\D/g, "");
        if (cleanedCnpj.length === 14) {
            const [existingCompany] = await db
                .select({ id: companies.id })
                .from(companies)
                .where(eq(companies.cnpj, cleanedCnpj))
                .limit(1);
            if (existingCompany) {
                throw new Error("COMPANY_CNPJ_ALREADY_EXISTS");
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
                throw new Error("REQUEST_ALREADY_PENDING");
            }
        }
    }

    const code = generateSixDigitCode();
    const codesRepo = new EmailVerificationCodesRepository();
    await codesRepo.createCode(data.email, "company_register", code, 15);

    await sendVerificationCodeEmail({
        to: data.email,
        code,
        purpose: "company_register",
        recipientName: data.name,
    });

    return {
        message: "Verification code sent to email",
        expiresInMinutes: 15,
    };
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

    const [existingCompany] = await db
        .select({ id: companies.id })
        .from(companies)
        .where(eq(companies.cnpj, data.cnpj))
        .limit(1);
    if (existingCompany) {
        throw new Error("COMPANY_CNPJ_ALREADY_EXISTS");
    }

    const [pendingCnpjReq] = await db
        .select({ id: companyRegistrationRequests.id })
        .from(companyRegistrationRequests)
        .where(
            and(
                eq(companyRegistrationRequests.cnpj, data.cnpj),
                eq(companyRegistrationRequests.status, "pending"),
            ),
        )
        .limit(1);
    if (pendingCnpjReq) {
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

    const codesRepo = new EmailVerificationCodesRepository();
    const verification = await codesRepo.verifyAndConsumeCode(
        data.adminEmail,
        "company_register",
        data.code,
    );
    if (!verification.ok) {
        throw new Error("INVALID_OR_EXPIRED_CODE");
    }

    const adminPasswordHash = await hashPassword(data.adminPassword);
    const acceptedAt = new Date();

    const created = await db.transaction(async (tx) => {
        const [reqRow] = await tx
            .insert(companyRegistrationRequests)
            .values({
                registeredCompanyName: data.registeredCompanyName,
                tradeName: data.tradeName,
                cnpj: data.cnpj,
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
                registeredCompanyName: companyRegistrationRequests.registeredCompanyName,
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

        return reqRow;
    });

    void sendCompanyRequestDecisionEmail({
        to: created.adminEmail,
        companyName: created.tradeName,
        adminName: created.adminName,
        decision: "received",
    });

    return created;
}

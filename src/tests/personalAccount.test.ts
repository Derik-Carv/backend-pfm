import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { app } from "@/app";
import { db } from "@/database/index";
import {
    auditLogs,
    companies,
    companyRegistrationRequests,
    costCenters,
    emailVerificationCodes,
    financialAccounts,
    financialCategories,
    financialEntries,
    financialIdempotencyKeys,
    financialSettlements,
    legalAcceptances,
    roles,
    userCompanies,
    users,
} from "@/database/schema/schema";
import { EmailVerificationCodesRepository } from "@/database/tables/emailVerificationCodes/emailVerificationCodes.repository";
import { maskCpf } from "@/lib/lgpd/legal.constants";
import {
    cnpjValidate,
    maskTenantDocument,
} from "@/utils/checkCnpj";
import { cpfValidateNormal } from "@/utils/checkCpf";
import { eq, inArray, or } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";

function makeValidCpf(seed9: string): string {
    const base = seed9.replace(/\D/g, "").slice(0, 9).padEnd(9, "1");
    let sum = 0;
    for (let i = 0; i < 9; i++) {
        sum += Number(base[i]) * (10 - i);
    }
    const d1 = ((sum * 10) % 11) % 10;
    let sum2 = 0;
    const withD1 = `${base}${d1}`;
    for (let i = 0; i < 10; i++) {
        sum2 += Number(withD1[i]) * (11 - i);
    }
    const d2 = ((sum2 * 10) % 11) % 10;
    return `${withD1}${d2}`;
}

function makeValidCnpj(seed12: string): string {
    const base = seed12.replace(/\D/g, "").slice(0, 12).padEnd(12, "1");
    const calc = (digits: string, weights: number[]) => {
        const sum = weights.reduce(
            (acc, weight, idx) => acc + Number(digits[idx]) * weight,
            0,
        );
        const rem = sum % 11;
        return rem < 2 ? 0 : 11 - rem;
    };
    const d1 = calc(base, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
    const withD1 = `${base}${d1}`;
    const d2 = calc(withD1, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
    const result = `${withD1}${d2}`;
    if (!cnpjValidate(result)) {
        throw new Error(`Generated invalid CNPJ from seed ${seed12}: ${result}`);
    }
    return result;
}

describe("Personal CPF Accounts & Document Validation", () => {
    const otpRepo = new EmailVerificationCodesRepository();
    const suffix = String(Date.now()).slice(-7);
    const personalEmail = `cpf.personal.${suffix}@example.test`.toLowerCase();
    const personalPassword = `Pass!${suffix}Aa`;
    const personalCpf = makeValidCpf(`41${suffix}`);
    const otherValidCpf = makeValidCpf(`52${suffix}`);
    const businessCnpj = makeValidCnpj(`31${suffix}001`);
    const businessAdminCpf = makeValidCpf(`63${suffix}`);

    let personalCompanyId = "";
    let personalUserId = "";
    let personalToken = "";
    let personalCategoryId = "";

    let businessCompanyId = "";
    let businessUserId = "";
    let businessToken = "";
    let businessCategoryId = "";

    const trackedEmails = [personalEmail, `biz.${suffix}@example.test`];

    beforeAll(async () => {
        await app.ready();

        const [companyAdminRole] = await db
            .select({ id: roles.id })
            .from(roles)
            .where(eq(roles.name, "company_admin"))
            .limit(1);

        if (!companyAdminRole) {
            throw new Error("Role company_admin must exist in test DB");
        }

        const [bizComp] = await db
            .insert(companies)
            .values({
                registeredCompanyName: `Biz Test ${suffix} LTDA`,
                tradeName: `Biz Test ${suffix}`,
                cnpj: businessCnpj,
                accountType: "business",
                active: true,
            })
            .returning();
        businessCompanyId = bizComp.id;

        const [bizUser] = await db
            .insert(users)
            .values({
                id: uuidv7(),
                name: "Biz",
                surname: "Admin",
                username: `biz.admin.${suffix}`,
                email: `biz.${suffix}@example.test`,
                emailVerified: true,
                password: "not-used-in-jwt-test",
                roleId: companyAdminRole.id,
                primaryCompanyId: businessCompanyId,
                cpf: businessAdminCpf,
                active: true,
                passwordChangeRequired: false,
                tokenVersion: 1,
            })
            .returning();
        businessUserId = bizUser.id;

        await db.insert(userCompanies).values({
            userId: businessUserId,
            companyId: businessCompanyId,
            isDefault: true,
        });

        businessToken = app.jwt.sign({
            id: businessUserId,
            role: "company_admin",
            cpf: businessAdminCpf,
            tv: 1,
            acessNow: new Date().toISOString(),
        });
    });

    afterAll(async () => {
        await new Promise((resolve) => setTimeout(resolve, 150));
        const companyIds = [personalCompanyId, businessCompanyId].filter(Boolean);
        const userIds = [personalUserId, businessUserId].filter(Boolean);

        if (companyIds.length > 0) {
            await db
                .delete(financialIdempotencyKeys)
                .where(inArray(financialIdempotencyKeys.companyId, companyIds));
            await db
                .delete(financialSettlements)
                .where(inArray(financialSettlements.companyId, companyIds));
            await db
                .delete(financialEntries)
                .where(inArray(financialEntries.companyId, companyIds));
            await db
                .delete(costCenters)
                .where(inArray(costCenters.companyId, companyIds));
            await db
                .delete(financialCategories)
                .where(inArray(financialCategories.companyId, companyIds));
            await db
                .delete(financialAccounts)
                .where(inArray(financialAccounts.companyId, companyIds));
            await db
                .delete(auditLogs)
                .where(inArray(auditLogs.companyId, companyIds));
        }

        if (userIds.length > 0) {
            await db
                .delete(auditLogs)
                .where(inArray(auditLogs.actorId, userIds));
            await db
                .delete(legalAcceptances)
                .where(inArray(legalAcceptances.userId, userIds));
            await db
                .delete(userCompanies)
                .where(inArray(userCompanies.userId, userIds));
        }

        const reqFilter = or(
            inArray(companyRegistrationRequests.adminEmail, trackedEmails),
            eq(companyRegistrationRequests.cnpj, personalCpf),
            ...(userIds.length > 0
                ? [inArray(companyRegistrationRequests.approvedUserId, userIds)]
                : []),
            ...(companyIds.length > 0
                ? [inArray(companyRegistrationRequests.approvedCompanyId, companyIds)]
                : []),
        );

        const matchingReqs = await db
            .select({ id: companyRegistrationRequests.id })
            .from(companyRegistrationRequests)
            .where(reqFilter);
        const reqIds = matchingReqs.map((r) => r.id);
        if (reqIds.length > 0) {
            await db
                .delete(legalAcceptances)
                .where(inArray(legalAcceptances.companyRequestId, reqIds));
        }

        await db.delete(companyRegistrationRequests).where(reqFilter);
        await db
            .delete(emailVerificationCodes)
            .where(inArray(emailVerificationCodes.email, trackedEmails));

        if (userIds.length > 0) {
            await db.delete(users).where(inArray(users.id, userIds));
        }
        if (companyIds.length > 0) {
            await db.delete(companies).where(inArray(companies.id, companyIds));
        }
    });

    it("validates CNPJ check digits and masks CPF tenant documents", async () => {
        expect(await cpfValidateNormal(personalCpf)).toBe(true);
        expect(await cpfValidateNormal("12345678900")).toBe(false);
        expect(cnpjValidate(businessCnpj)).toBe(true);
        expect(cnpjValidate("11.222.333/0001-81")).toBe(true);
        expect(cnpjValidate("00.000.000/0000-00")).toBe(false);
        expect(cnpjValidate("11.111.111/1111-11")).toBe(false);
        expect(cnpjValidate("11222333000180")).toBe(false);
        expect(cnpjValidate("123456")).toBe(false);

        expect(maskTenantDocument("12345678909", "personal")).toBe(maskCpf("12345678909"));
        expect(maskTenantDocument("12345678909")).toBe(maskCpf("12345678909"));
        expect(maskTenantDocument("11222333000181", "business")).toBe("11222333000181");
        expect(maskTenantDocument(null, "personal")).toBe("");
    });

    it("rejects mathematically invalid CPF or CNPJ during onboarding OTP request", async () => {
        const badCpfRes = await app.inject({
            method: "POST",
            url: "/public/company-requests/request-code",
            payload: {
                accountType: "personal",
                email: `invalid.cpf.${suffix}@example.test`,
                cpf: "12345678900",
                name: "Teste",
            },
        });
        expect(badCpfRes.statusCode).toBe(400);

        const badCnpjRes = await app.inject({
            method: "POST",
            url: "/public/company-requests/request-code",
            payload: {
                accountType: "business",
                email: `invalid.cnpj.${suffix}@example.test`,
                cnpj: "11222333000199",
                name: "Empresa",
            },
        });
        expect(badCnpjRes.statusCode).toBe(400);
    });

    it("auto-activates personal CPF account via OTP without SaaS admin approval and masks CPF", async () => {
        await otpRepo.createCode(personalEmail, "company_register", "654321", 15);

        const submitRes = await app.inject({
            method: "POST",
            url: "/public/company-requests",
            payload: {
                accountType: "personal",
                tradeName: `Espaço ${suffix}`,
                adminName: "Maria",
                adminSurname: "Silva",
                adminEmail: personalEmail,
                adminCpf: personalCpf,
                adminPassword: personalPassword,
                code: "654321",
                acceptedTerms: true,
                acceptedPrivacy: true,
            },
        });

        expect(submitRes.statusCode).toBe(201);
        const body = submitRes.json();
        expect(body.autoApproved).toBe(true);
        expect(body.request.accountType).toBe("personal");
        expect(body.request.status).toBe("approved");
        expect(body.request.cnpj).toBe(maskCpf(personalCpf));
        expect(body.username).toBeTruthy();

        const [createdUser] = await db
            .select()
            .from(users)
            .where(eq(users.email, personalEmail))
            .limit(1);
        expect(createdUser).toBeDefined();
        expect(createdUser.active).toBe(true);
        expect(createdUser.emailVerified).toBe(true);
        expect(createdUser.passwordChangeRequired).toBe(false);
        personalUserId = createdUser.id;
        personalCompanyId = createdUser.primaryCompanyId ?? "";

        const [createdCompany] = await db
            .select()
            .from(companies)
            .where(eq(companies.id, personalCompanyId))
            .limit(1);
        expect(createdCompany).toBeDefined();
        expect(createdCompany.accountType).toBe("personal");
        expect(createdCompany.active).toBe(true);
        expect(createdCompany.motherId).toBeNull();
        expect(createdCompany.cnpj).toBe(personalCpf);

        // Anti-enumeration: subsequent request-code with existing CPF/email returns 200
        await db
            .delete(emailVerificationCodes)
            .where(eq(emailVerificationCodes.email, personalEmail));
        const enumRes = await app.inject({
            method: "POST",
            url: "/public/company-requests/request-code",
            payload: {
                accountType: "personal",
                email: personalEmail,
                cpf: personalCpf,
                name: "Maria",
            },
        });
        expect(enumRes.statusCode).toBe(200);

        // Immediate login works without password change prompt or legal gate
        const loginRes = await app.inject({
            method: "POST",
            url: "/public/login",
            payload: {
                username: personalEmail,
                password: personalPassword,
            },
        });
        expect(loginRes.statusCode).toBe(200);
        const loginBody = loginRes.json();
        expect(loginBody.token).toBeTruthy();
        expect(loginBody.passwordChangeRequired).toBe(false);
        expect(loginBody.legalAcceptanceRequired).toBe(false);
        personalToken = loginBody.token;
    });

    it("enforces personal tenant guards across companies, NF, privacy, and finance", async () => {
        // /companies/me masks CPF and ignores x-view-scope: consolidated
        const companiesMeRes = await app.inject({
            method: "GET",
            url: "/companies/me",
            headers: {
                Authorization: `Bearer ${personalToken}`,
                "x-view-scope": "consolidated",
            },
        });
        expect(companiesMeRes.statusCode).toBe(200);
        const companiesMeBody = companiesMeRes.json();
        expect(companiesMeBody.isConsolidated).toBe(false);
        expect(companiesMeBody.companies[0].accountType).toBe("personal");
        expect(companiesMeBody.companies[0].cnpj).toBe(maskCpf(personalCpf));

        // /account/privacy/me masks tenant document and reports personal accountType
        const privacyMeRes = await app.inject({
            method: "GET",
            url: "/account/privacy/me",
            headers: { Authorization: `Bearer ${personalToken}` },
        });
        expect(privacyMeRes.statusCode).toBe(200);
        const privacyMeBody = privacyMeRes.json();
        expect(privacyMeBody.companies[0].accountType).toBe("personal");
        expect(privacyMeBody.companies[0].cnpj).toBe(maskCpf(personalCpf));

        // Branches & team management blocked with 403 on personal account
        const createBranchRes = await app.inject({
            method: "POST",
            url: "/companies/branches",
            headers: { Authorization: `Bearer ${personalToken}` },
            payload: {
                motherId: personalCompanyId,
                registeredCompanyName: "Filial Proibida LTDA",
                tradeName: "Filial Proibida",
                cnpj: makeValidCnpj(`78${suffix}001`),
            },
        });
        expect(createBranchRes.statusCode).toBe(403);

        const listUsersRes = await app.inject({
            method: "GET",
            url: "/companies/users",
            headers: { Authorization: `Bearer ${personalToken}` },
        });
        expect(listUsersRes.statusCode).toBe(403);

        const createUserRes = await app.inject({
            method: "POST",
            url: "/companies/users",
            headers: { Authorization: `Bearer ${personalToken}` },
            payload: {
                name: "Outro",
                surname: "Usuario",
                email: `blocked.team.${suffix}@example.test`,
                cpf: otherValidCpf,
                password: personalPassword,
                roleName: "finance",
            },
        });
        expect(createUserRes.statusCode).toBe(403);

        // Notas fiscais e movimentações bloqueadas com 403 em conta pessoal; GET /companies/branches retorna []
        const listBranchesRes = await app.inject({
            method: "GET",
            url: "/companies/branches",
            headers: { Authorization: `Bearer ${personalToken}` },
        });
        expect(listBranchesRes.statusCode).toBe(200);
        expect(listBranchesRes.json().companies).toEqual([]);

        const movRes = await app.inject({
            method: "GET",
            url: "/movimentations",
            headers: { Authorization: `Bearer ${personalToken}` },
        });
        expect(movRes.statusCode).toBe(403);

        const notesRes = await app.inject({
            method: "GET",
            url: "/notes?page=1&limit=10",
            headers: { Authorization: `Bearer ${personalToken}` },
        });
        expect(notesRes.statusCode).toBe(403);

        // Personal finance categories are seeded cleanly
        const catRes = await app.inject({
            method: "GET",
            url: "/finance/categories",
            headers: { Authorization: `Bearer ${personalToken}` },
        });
        expect(catRes.statusCode).toBe(200);
        const cats = catRes.json().categories as Array<{ id: string; code: string; name: string }>;
        const housingCat = cats.find((c) => c.code === "2.01");
        expect(housingCat).toBeDefined();
        expect(housingCat?.name).toContain("Moradia");
        personalCategoryId = housingCat!.id;

        // Personal entry WITHOUT clientId succeeds with counterpartyName
        const entryWithNameRes = await app.inject({
            method: "POST",
            url: "/finance/entries",
            headers: {
                Authorization: `Bearer ${personalToken}`,
                "Idempotency-Key": `pers-named-${suffix}`,
            },
            payload: {
                entryType: "payable",
                description: "Compras do mês",
                counterpartyName: "Supermercado Central",
                categoryId: personalCategoryId,
                competenceDate: "2026-11-28",
                issueDate: "2026-11-28",
                dueDate: "2026-12-05",
                originalAmountCents: 35000,
                discountCents: 0,
                interestCents: 0,
                fineCents: 0,
                totalInstallments: 1,
                isIntercompany: false,
            },
        });
        expect(entryWithNameRes.statusCode).toBe(201);
        const namedEntry = entryWithNameRes.json().entries[0];
        expect(namedEntry.clientId).toBeNull();
        expect(namedEntry.counterpartyName).toBe("Supermercado Central");

        // Personal entry WITHOUT clientId and WITHOUT counterpartyName defaults cleanly
        const entryUnnamedRes = await app.inject({
            method: "POST",
            url: "/finance/entries",
            headers: {
                Authorization: `Bearer ${personalToken}`,
                "Idempotency-Key": `pers-unnamed-${suffix}`,
            },
            payload: {
                entryType: "payable",
                description: "Conta de energia",
                categoryId: personalCategoryId,
                competenceDate: "2026-11-28",
                issueDate: "2026-11-28",
                dueDate: "2026-12-10",
                originalAmountCents: 18000,
                discountCents: 0,
                interestCents: 0,
                fineCents: 0,
                totalInstallments: 1,
                isIntercompany: false,
            },
        });
        expect(entryUnnamedRes.statusCode).toBe(201);
        expect(entryUnnamedRes.json().entries[0].counterpartyName).toBe("Não informado");

        // Personal account cannot link NF or mark intercompany
        const nfBlockedRes = await app.inject({
            method: "POST",
            url: "/finance/entries",
            headers: {
                Authorization: `Bearer ${personalToken}`,
                "Idempotency-Key": `pers-nf-${suffix}`,
            },
            payload: {
                entryType: "receivable",
                description: "Tentativa NF",
                categoryId: personalCategoryId,
                nfId: uuidv7(),
                competenceDate: "2026-11-28",
                issueDate: "2026-11-28",
                dueDate: "2026-12-10",
                originalAmountCents: 10000,
                discountCents: 0,
                interestCents: 0,
                fineCents: 0,
                totalInstallments: 1,
                isIntercompany: false,
            },
        });
        expect(nfBlockedRes.statusCode).toBe(403);

        // Business CNPJ account still enforces CLIENT_REQUIRED when clientId is omitted
        const bizCatRes = await app.inject({
            method: "GET",
            url: "/finance/categories",
            headers: { Authorization: `Bearer ${businessToken}` },
        });
        expect(bizCatRes.statusCode).toBe(200);
        businessCategoryId = bizCatRes.json().categories[0].id;

        const bizNoClientRes = await app.inject({
            method: "POST",
            url: "/finance/entries",
            headers: {
                Authorization: `Bearer ${businessToken}`,
                "Idempotency-Key": `biz-noclient-${suffix}`,
            },
            payload: {
                entryType: "payable",
                description: "Despesa PJ sem cliente",
                categoryId: businessCategoryId,
                competenceDate: "2026-11-28",
                issueDate: "2026-11-28",
                dueDate: "2026-12-10",
                originalAmountCents: 25000,
                discountCents: 0,
                interestCents: 0,
                fineCents: 0,
                totalInstallments: 1,
                isIntercompany: false,
            },
        });
        expect(bizNoClientRes.statusCode).toBe(400);
        expect(bizNoClientRes.json().error).toBe("CLIENT_REQUIRED");
    });

    it("auto-generates cost center and category codes by default and allows manual codes only when admin enables", async () => {
        // Default: manual code blocked (403)
        const blockedCc = await app.inject({
            method: "POST",
            url: "/finance/cost-centers",
            headers: { Authorization: `Bearer ${personalToken}` },
            payload: { code: "MANUAL-01", name: "Centro Manual Bloqueado" },
        });
        expect(blockedCc.statusCode).toBe(403);
        expect(blockedCc.json().error).toBe("MANUAL_CODE_NOT_ENABLED");

        const blockedCat = await app.inject({
            method: "POST",
            url: "/finance/categories",
            headers: { Authorization: `Bearer ${personalToken}` },
            payload: {
                code: "9.99",
                name: "Categoria Manual Bloqueada",
                kind: "operating_expense",
            },
        });
        expect(blockedCat.statusCode).toBe(403);
        expect(blockedCat.json().error).toBe("MANUAL_CODE_NOT_ENABLED");

        // Auto-generated cost center codes: CC-01, CC-02
        const autoCc1 = await app.inject({
            method: "POST",
            url: "/finance/cost-centers",
            headers: { Authorization: `Bearer ${personalToken}` },
            payload: { name: "Casa" },
        });
        expect(autoCc1.statusCode).toBe(201);
        expect(autoCc1.json().costCenter.code).toBe("CC-01");

        const autoCc2 = await app.inject({
            method: "POST",
            url: "/finance/cost-centers",
            headers: { Authorization: `Bearer ${personalToken}` },
            payload: { name: "Lazer" },
        });
        expect(autoCc2.statusCode).toBe(201);
        expect(autoCc2.json().costCenter.code).toBe("CC-02");

        // Auto-generated personal operating_expense category (2.01..2.07 exist -> 2.08)
        const autoCat = await app.inject({
            method: "POST",
            url: "/finance/categories",
            headers: { Authorization: `Bearer ${personalToken}` },
            payload: { name: "Pets", kind: "operating_expense" },
        });
        expect(autoCat.statusCode).toBe(201);
        expect(autoCat.json().category.code).toBe("2.08");

        // Admin enables manual finance codes via PATCH /companies/me/settings
        const enableRes = await app.inject({
            method: "PATCH",
            url: "/companies/me/settings",
            headers: { Authorization: `Bearer ${personalToken}` },
            payload: { allowManualFinanceCodes: true },
        });
        expect(enableRes.statusCode).toBe(200);
        expect(enableRes.json().company.allowManualFinanceCodes).toBe(true);

        // Now manual code succeeds AND omitting code still auto-generates cleanly
        const manualCc = await app.inject({
            method: "POST",
            url: "/finance/cost-centers",
            headers: { Authorization: `Bearer ${personalToken}` },
            payload: { code: "ERP-90", name: "Centro Externo" },
        });
        expect(manualCc.statusCode).toBe(201);
        expect(manualCc.json().costCenter.code).toBe("ERP-90");

        const autoCc3AfterManual = await app.inject({
            method: "POST",
            url: "/finance/cost-centers",
            headers: { Authorization: `Bearer ${personalToken}` },
            payload: { name: "Trabalho Informal" },
        });
        expect(autoCc3AfterManual.statusCode).toBe(201);
        expect(autoCc3AfterManual.json().costCenter.code).toBe("CC-03");

        const manualCat = await app.inject({
            method: "POST",
            url: "/finance/categories",
            headers: { Authorization: `Bearer ${personalToken}` },
            payload: {
                code: "9.99",
                name: "Integração Externa",
                kind: "operating_expense",
            },
        });
        expect(manualCat.statusCode).toBe(201);
        expect(manualCat.json().category.code).toBe("9.99");
    });

    it("validates CPF before DB checks (anti-enumeration) and locks counterpartyName after settlement", async () => {
        // Anti-enumeration: existing email + invalid CPF returns 400 identically to unknown email
        const existingEmailInvalidCpf = await app.inject({
            method: "POST",
            url: "/public/company-requests/request-code",
            remoteAddress: "198.51.100.230",
            payload: {
                accountType: "personal",
                email: personalEmail,
                cpf: "00000000000",
                name: "Probe",
            },
        });
        expect(existingEmailInvalidCpf.statusCode).toBe(400);

        // Create account and personal entry, settle partially, then block counterpartyName edit
        const accRes = await app.inject({
            method: "POST",
            url: "/finance/accounts",
            headers: { Authorization: `Bearer ${personalToken}` },
            payload: {
                name: "Carteira Pessoal Teste",
                type: "checking",
                initialBalanceCents: 10000,
                initialBalanceDate: "2026-11-01",
            },
        });
        expect(accRes.statusCode).toBe(201);
        const accId = accRes.json().account.id as string;

        const entryRes = await app.inject({
            method: "POST",
            url: "/finance/entries",
            headers: {
                Authorization: `Bearer ${personalToken}`,
                "Idempotency-Key": `pers-lock-${suffix}`,
            },
            payload: {
                entryType: "payable",
                description: "Compra parcelada PF",
                counterpartyName: "Loja Original",
                categoryId: personalCategoryId,
                competenceDate: "2026-11-28",
                issueDate: "2026-11-28",
                dueDate: "2026-12-10",
                originalAmountCents: 40000,
                discountCents: 0,
                interestCents: 0,
                fineCents: 0,
                totalInstallments: 1,
                isIntercompany: false,
            },
        });
        expect(entryRes.statusCode).toBe(201);
        const entryId = entryRes.json().entries[0].id as string;

        const settleRes = await app.inject({
            method: "POST",
            url: `/finance/entries/${entryId}/settle`,
            headers: {
                Authorization: `Bearer ${personalToken}`,
                "Idempotency-Key": `pers-settle-lock-${suffix}`,
            },
            payload: {
                accountId: accId,
                paymentMethod: "pix",
                principalCents: 10000,
            },
        });
        expect(settleRes.statusCode).toBe(201);

        const patchCounterpartyRes = await app.inject({
            method: "PATCH",
            url: `/finance/entries/${entryId}`,
            headers: { Authorization: `Bearer ${personalToken}` },
            payload: {
                counterpartyName: "Loja Adulterada",
            },
        });
        expect(patchCounterpartyRes.statusCode).toBe(409);
        expect(patchCounterpartyRes.json().error).toBe("ENTRY_HAS_SETTLEMENTS");
    });

    it("anonymizes user, personal company, token_version, and registration request on LGPD anonymization", async () => {
        const anonRes = await app.inject({
            method: "POST",
            url: "/account/privacy/anonymize",
            headers: { Authorization: `Bearer ${personalToken}` },
            payload: {
                currentPassword: personalPassword,
                confirmation: "ANONIMIZAR",
            },
        });
        expect(anonRes.statusCode).toBe(200);

        const [anonUser] = await db
            .select()
            .from(users)
            .where(eq(users.id, personalUserId))
            .limit(1);
        expect(anonUser.active).toBe(false);
        expect(anonUser.anonymizedAt).not.toBeNull();
        expect(anonUser.cpf.startsWith("ANON-")).toBe(true);
        expect(anonUser.tokenVersion).toBeGreaterThan(1);

        const [anonCompany] = await db
            .select()
            .from(companies)
            .where(eq(companies.id, personalCompanyId))
            .limit(1);
        expect(anonCompany.active).toBe(false);
        expect(anonCompany.cnpj.startsWith("ANON-")).toBe(true);

        const [anonRequest] = await db
            .select()
            .from(companyRegistrationRequests)
            .where(eq(companyRegistrationRequests.approvedUserId, personalUserId))
            .limit(1);
        expect(anonRequest).toBeDefined();
        expect(anonRequest.cnpj.startsWith("ANON-")).toBe(true);
        expect(anonRequest.adminCpf.startsWith("ANON-")).toBe(true);
        expect(anonRequest.adminEmail.startsWith("anon_")).toBe(true);
        expect(anonRequest.adminName).toBe("Usuário Anonimizado");

        const postAnonLogin = await app.inject({
            method: "POST",
            url: "/public/login",
            payload: {
                username: personalEmail,
                password: personalPassword,
            },
        });
        expect(postAnonLogin.statusCode).toBe(401);
    });
});

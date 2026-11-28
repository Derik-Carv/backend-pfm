import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { app } from "@/app";
import { loggerConfig } from "@/config/logger";
import { db } from "@/database/index";
import {
    auditLogs,
    clients,
    companies,
    costCenters,
    financialAccounts,
    financialCategories,
    financialEntries,
    financialIdempotencyKeys,
    financialSettlements,
    nf,
    roles,
    services,
    type as nfTypeTable,
    userCompanies,
    users,
} from "@/database/schema/schema";
import {
    addMonthsIsoDateWithFixedDay,
} from "@/database/tables/finance/finance.repository";
import { buildCsv, sanitizeCsvCell } from "@/lib/finance/csv";
import {
    extractIdempotencyKey,
    hashIdempotencyPayload,
} from "@/lib/finance/idempotency";
import {
    calculateEntryNetCents,
    calculateSettlementTotals,
    centsToDecimalString,
    computeEntryStatusAfterSettlement,
    intToCents,
    parseDecimalToCents,
    splitAmountIntoInstallments,
} from "@/lib/finance/money";
import {
    createEntryBodySchema,
    isoDateSchema,
    isValidIsoCalendarDate,
    listEntriesQuerySchema,
    updateEntryBodySchema,
} from "@/router/private/finance/finance.schemas";
import { eq, inArray, or } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";

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
    return `${withD1}${d2}`;
}

describe("Finance Domain Pure Money Math", () => {
    it("avoids binary float inaccuracies when parsing decimals and summing cents", () => {
        const a = parseDecimalToCents("0.10");
        const b = parseDecimalToCents("0.2");
        expect(a + b).toBe(30n);
        expect(centsToDecimalString(a + b)).toBe("0.30");

        expect(parseDecimalToCents("1250,55")).toBe(125055n);
        expect(parseDecimalToCents(199.9)).toBe(19990n);
        expect(() => parseDecimalToCents("-10.00")).toThrow();
        expect(() => parseDecimalToCents("10.999")).toThrow();
        expect(() => parseDecimalToCents(Number.NaN)).toThrow();
    });

    it("computes net entry amount and splits installments without losing cents", () => {
        const net = calculateEntryNetCents({
            originalAmountCents: 10000n,
            discountCents: 500n,
            interestCents: 200n,
            fineCents: 300n,
        });
        expect(net).toBe(10000n);

        const parts = splitAmountIntoInstallments(10000n, 3);
        expect(parts).toEqual([3334n, 3333n, 3333n]);
        expect(parts.reduce((acc, v) => acc + v, 0n)).toBe(10000n);
    });

    it("calculates receivable & payable settlement deltas with gateway fee", () => {
        const rec = calculateSettlementTotals({
            entryType: "receivable",
            principalCents: 10000n,
            interestCents: 500n,
            fineCents: 200n,
            discountCents: 100n,
            gatewayFeeCents: 350n,
        });
        expect(rec.totalSettledCents).toBe(10600n);
        expect(rec.accountDeltaCents).toBe(10250n);

        const pay = calculateSettlementTotals({
            entryType: "payable",
            principalCents: 5000n,
            interestCents: 100n,
            fineCents: 0n,
            discountCents: 0n,
            gatewayFeeCents: 150n,
        });
        expect(pay.totalSettledCents).toBe(5100n);
        expect(pay.accountDeltaCents).toBe(-5250n);

        expect(() =>
            calculateSettlementTotals({
                entryType: "receivable",
                principalCents: 1000n,
                interestCents: 0n,
                fineCents: 0n,
                discountCents: 0n,
                gatewayFeeCents: 1500n,
            }),
        ).toThrow("GATEWAY_FEE_EXCEEDS_SETTLEMENT");
    });

    it("computes entry status transitions consistently", () => {
        expect(
            computeEntryStatusAfterSettlement({
                netAmountCents: 10000n,
                newSettledAmountCents: 10000n,
                dueDate: "2026-11-20",
                todayIso: "2026-11-26",
            }),
        ).toBe("paid");

        expect(
            computeEntryStatusAfterSettlement({
                netAmountCents: 10000n,
                newSettledAmountCents: 4000n,
                dueDate: "2026-11-20",
                todayIso: "2026-11-26",
            }),
        ).toBe("partially_paid");

        expect(
            computeEntryStatusAfterSettlement({
                netAmountCents: 10000n,
                newSettledAmountCents: 0n,
                dueDate: "2026-11-20",
                todayIso: "2026-11-26",
            }),
        ).toBe("overdue");

        expect(
            computeEntryStatusAfterSettlement({
                netAmountCents: 10000n,
                newSettledAmountCents: 0n,
                dueDate: "2026-11-30",
                todayIso: "2026-11-26",
            }),
        ).toBe("pending");
    });
});

describe("CSV Formula Injection Neutralization & Idempotency", () => {
    it("prefixes leading apostrophe on dangerous formula characters including leading spaces", () => {
        expect(sanitizeCsvCell("=CMD('calc')")).toBe(`"'=CMD('calc')"`);
        expect(sanitizeCsvCell("+1+1")).toBe(`"'+1+1"`);
        expect(sanitizeCsvCell("-1+1")).toBe(`"'-1+1"`);
        expect(sanitizeCsvCell("@SUM(A1:A2)")).toBe(`"'@SUM(A1:A2)"`);
        expect(sanitizeCsvCell("\t=1+1")).toBe(`"'\t=1+1"`);
        expect(sanitizeCsvCell("  =HYPERLINK(\"http://evil\")")).toBe(
            `"'  =HYPERLINK(""http://evil"")"`,
        );

        const csv = buildCsv(["Desc"], [["=1+1"]]);
        expect(csv.startsWith("\uFEFF")).toBe(true);
        expect(csv).toContain(`"'=1+1"`);
    });

    it("validates Idempotency-Key and produces order-independent SHA-256 hashes", () => {
        expect(extractIdempotencyKey("  key-2026_abc:01  ")).toBe("key-2026_abc:01");
        expect(() => extractIdempotencyKey("short")).toThrow();
        expect(() => extractIdempotencyKey("invalid space key!")).toThrow();

        const h1 = hashIdempotencyPayload({ b: 2, a: 1, nested: { y: 9, x: 8 } });
        const h2 = hashIdempotencyPayload({ a: 1, b: 2, nested: { x: 8, y: 9 } });
        expect(h1).toBe(h2);
        expect(h1).toHaveLength(64);
    });
});

describe("Security Controls: Logger Redact & Zod Schemas", () => {
    it("redacts financial/banking secrets in Pino config", () => {
        const redactList = loggerConfig.redact;
        for (const key of [
            "pixKey",
            "bankAccount",
            "agency",
            "accountNumber",
            "certPassword",
            "pfx",
            "privateKey",
            "clientSecret",
            "webhookSecret",
            "accessToken",
            "refreshToken",
            "authorizationCode",
        ]) {
            expect(redactList).toContain(key);
            expect(redactList).toContain(`body.${key}`);
            expect(redactList).toContain(`*.${key}`);
        }
    });

    it("strips mass-assignment fields and rejects oversized limits", () => {
        const parsed = createEntryBodySchema.parse({
            entryType: "receivable",
            description: "Mensalidade SaaS",
            clientId: "0194851b-55c1-7000-8000-000000000002",
            categoryId: "0194851b-55c1-7000-8000-000000000001",
            competenceDate: "2026-11-01",
            issueDate: "2026-11-01",
            dueDate: "2026-11-10",
            originalAmountCents: 15000,
            settledAmountCents: 15000,
            netAmountCents: 1,
            companyId: "0194851b-55c1-7000-8000-000000000099",
            createdBy: "0194851b-55c1-7000-8000-000000000099",
        }) as Record<string, unknown>;

        expect(parsed.settledAmountCents).toBeUndefined();
        expect(parsed.netAmountCents).toBeUndefined();
        expect(parsed.companyId).toBeUndefined();
        expect(parsed.createdBy).toBeUndefined();

        expect(
            createEntryBodySchema.safeParse({
                entryType: "receivable",
                description: "Sem cliente",
                categoryId: "0194851b-55c1-7000-8000-000000000001",
                competenceDate: "2026-11-01",
                issueDate: "2026-11-01",
                dueDate: "2026-11-10",
                originalAmountCents: 15000,
            }).success,
        ).toBe(true);

        expect(
            createEntryBodySchema.safeParse({
                entryType: "receivable",
                description: "Parcelado sem dia fixo",
                clientId: "0194851b-55c1-7000-8000-000000000002",
                categoryId: "0194851b-55c1-7000-8000-000000000001",
                competenceDate: "2026-11-01",
                issueDate: "2026-11-01",
                dueDate: "2026-11-10",
                originalAmountCents: 30000,
                totalInstallments: 3,
            }).success,
        ).toBe(false);

        expect(addMonthsIsoDateWithFixedDay("2026-01-15", 0, 31)).toBe("2026-01-31");
        expect(addMonthsIsoDateWithFixedDay("2026-01-15", 1, 31)).toBe("2026-02-28");
        expect(addMonthsIsoDateWithFixedDay("2026-01-15", 2, 31)).toBe("2026-03-31");

        expect(listEntriesQuerySchema.safeParse({ limit: 500 }).success).toBe(false);
    });

    it("validates real calendar dates, signed cents allowNegative, and locked entry updates (P1)", () => {
        expect(isValidIsoCalendarDate("2024-02-29")).toBe(true);
        expect(isValidIsoCalendarDate("2026-11-27")).toBe(true);
        expect(isValidIsoCalendarDate("2026-99-99")).toBe(false);
        expect(isValidIsoCalendarDate("2026-02-31")).toBe(false);
        expect(isValidIsoCalendarDate("2026-04-31")).toBe(false);
        expect(isoDateSchema.safeParse("2026-02-30").success).toBe(false);

        expect(intToCents(-50000, { allowNegative: true })).toBe(-50000n);
        expect(() => intToCents(-1)).toThrow("INVALID_MONETARY_AMOUNT");

        const strippedUpdate = updateEntryBodySchema.parse({
            description: "Atualizada",
            counterpartyDocument: "11122233344",
            settledAmountCents: 99999,
        }) as Record<string, unknown>;
        expect(strippedUpdate.counterpartyDocument).toBeUndefined();
        expect(strippedUpdate.settledAmountCents).toBeUndefined();
        expect(updateEntryBodySchema.safeParse({ clientId: null }).success).toBe(false);
    });
});

describe("Finance Module Phase 1 Integration (PostgreSQL + Fastify)", () => {
    const suffix = Date.now().toString();
    let companyAId = "";
    let companyBId = "";
    let financeUserId = "";
    let observerUserId = "";
    let colabUserId = "";
    let otherCompUserId = "";
    let clientAId = "";
    let serviceAId = "";
    let nfAId = "";
    let createdTypeId: string | null = null;

    let financeToken = "";
    let observerToken = "";
    let colabToken = "";
    let otherCompToken = "";

    beforeAll(async () => {
        await app.ready();

        const allDbRoles = await db.select().from(roles);
        const roleByName = new Map(allDbRoles.map((r) => [r.name, r.id]));

        const compACnpj = makeValidCnpj(`88${suffix.slice(-10)}`);
        const [compA] = await db
            .insert(companies)
            .values({
                registeredCompanyName: `FinTest Matrix ${suffix}`,
                tradeName: `FinTest Matrix ${suffix}`,
                cnpj: compACnpj,
                active: true,
            })
            .returning();
        companyAId = compA.id;

        const [compB] = await db
            .insert(companies)
            .values({
                registeredCompanyName: `FinTest Other ${suffix}`,
                tradeName: `FinTest Other ${suffix}`,
                cnpj: `99${suffix.slice(-12)}`,
                active: true,
            })
            .returning();
        companyBId = compB.id;

        let userIdx = 0;
        const makeUser = async (
            tag: string,
            roleName: string,
            compId: string,
        ) => {
            userIdx += 1;
            const roleId = roleByName.get(roleName);
            if (!roleId) throw new Error(`Missing role ${roleName}`);
            const uid = uuidv7();
            const uniqueCpf = `${userIdx}${suffix.slice(-8)}${uid.slice(-2)}`;
            const [u] = await db
                .insert(users)
                .values({
                    id: uid,
                    name: tag,
                    surname: "Test",
                    username: `fintest.${tag}.${suffix}`,
                    email: `fintest.${tag}.${suffix}@example.test`,
                    emailVerified: true,
                    password: "not-used-in-jwt-test",
                    roleId,
                    primaryCompanyId: compId,
                    cpf: uniqueCpf,
                    active: true,
                    passwordChangeRequired: false,
                    tokenVersion: 1,
                })
                .returning();

            await db.insert(userCompanies).values({
                userId: u.id,
                companyId: compId,
                isDefault: true,
            });

            const token = app.jwt.sign({
                id: u.id,
                role: roleName,
                cpf: u.cpf,
                tv: u.tokenVersion,
                acessNow: new Date().toISOString(),
            });
            return { user: u, token };
        };

        const fin = await makeUser("fin", "finance", companyAId);
        financeUserId = fin.user.id;
        financeToken = fin.token;

        const obs = await makeUser("obs", "observer", companyAId);
        observerUserId = obs.user.id;
        observerToken = obs.token;

        const colab = await makeUser("colab", "colaborator", companyAId);
        colabUserId = colab.user.id;
        colabToken = colab.token;

        const other = await makeUser("other", "company_admin", companyBId);
        otherCompUserId = other.user.id;
        otherCompToken = other.token;

        const [cli] = await db
            .insert(clients)
            .values({
                companyId: companyAId,
                registeredCompanyName: `Cliente FinTest ${suffix}`,
                tradeName: `Cliente FinTest ${suffix}`,
                cnpj: `77${suffix.slice(-12)}`,
            })
            .returning();
        clientAId = cli.id;

        const [svc] = await db
            .insert(services)
            .values({
                companyId: companyAId,
                serviceName: "Consultoria SaaS Teste",
                price: "1200.00",
                initialDate: "2026-11-01",
                finishDate: "2026-11-30",
                clientId: clientAId,
                details: "Projeto piloto financeiro",
                active: true,
            })
            .returning();
        serviceAId = svc.id;

        const existingTypes = await db.select().from(nfTypeTable).limit(1);
        let typeId = existingTypes[0]?.id;
        if (!typeId) {
            const [newType] = await db
                .insert(nfTypeTable)
                .values({ name: `NF FinTest ${suffix}` })
                .returning();
            typeId = newType.id;
            createdTypeId = typeId;
        }

        const [createdNf] = await db
            .insert(nf)
            .values({
                companyId: companyAId,
                typeId,
                numberNf: `900${suffix.slice(-4)}`,
                acessKey: `352611${suffix.slice(-10).padStart(38, "0")}`,
                thirdPartyClientId: clientAId,
                emissionDate: "2026-11-10",
                totalValue: "1200.00",
                servicesId: serviceAId,
                active: true,
            })
            .returning();
        nfAId = createdNf.id;
    });

    afterAll(async () => {
        await new Promise((resolve) => setTimeout(resolve, 150));
        const companyIds = [companyAId, companyBId].filter(Boolean);
        const userIds = [
            financeUserId,
            observerUserId,
            colabUserId,
            otherCompUserId,
        ].filter(Boolean);

        if (companyIds.length > 0 || userIds.length > 0) {
            await db
                .delete(auditLogs)
                .where(
                    or(
                        ...(companyIds.length > 0
                            ? [inArray(auditLogs.companyId, companyIds)]
                            : []),
                        ...(userIds.length > 0
                            ? [inArray(auditLogs.actorId, userIds)]
                            : []),
                    ),
                );
        }

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
                .delete(nf)
                .where(inArray(nf.companyId, companyIds));
            await db
                .delete(services)
                .where(inArray(services.companyId, companyIds));
            await db
                .delete(clients)
                .where(inArray(clients.companyId, companyIds));
        }

        if (createdTypeId) {
            await db.delete(nfTypeTable).where(eq(nfTypeTable.id, createdTypeId));
        }

        if (userIds.length > 0) {
            await db
                .delete(userCompanies)
                .where(inArray(userCompanies.userId, userIds));
            await db.delete(users).where(inArray(users.id, userIds));
        }

        if (companyIds.length > 0) {
            await db.delete(companies).where(inArray(companies.id, companyIds));
        }
    });

    it("enforces RBAC: blocks colaborator (403) and limits observer to read-only", async () => {
        const colabRes = await app.inject({
            method: "GET",
            url: "/finance/accounts",
            headers: { authorization: `Bearer ${colabToken}` },
        });
        expect(colabRes.statusCode).toBe(403);

        const obsRead = await app.inject({
            method: "GET",
            url: "/finance/categories",
            headers: { authorization: `Bearer ${observerToken}` },
        });
        expect(obsRead.statusCode).toBe(200);
        const obsBody = obsRead.json();
        expect(obsBody.categories.length).toBeGreaterThanOrEqual(11);

        const obsWrite = await app.inject({
            method: "POST",
            url: "/finance/accounts",
            headers: { authorization: `Bearer ${observerToken}` },
            payload: {
                name: "Conta Observer",
                type: "checking",
                initialBalanceCents: 0,
                initialBalanceDate: "2026-11-01",
            },
        });
        expect(obsWrite.statusCode).toBe(403);
    });

    it("runs full lifecycle: account -> service entry -> idempotency -> partial/full settle -> reversal -> reports -> cross-tenant block", async () => {
        // 1. Create Account with R$ 1.000,00 (100000 cents)
        const accRes = await app.inject({
            method: "POST",
            url: "/finance/accounts",
            headers: { authorization: `Bearer ${financeToken}` },
            payload: {
                name: "Banco Cora Teste",
                type: "checking",
                bankCode: "403",
                initialBalanceCents: 100000,
                initialBalanceDate: "2026-11-01",
            },
        });
        expect(accRes.statusCode).toBe(201);
        const accountId = accRes.json().account.id as string;

        // 2. Generate Receivable Entry from service + NF (idempotent)
        const fromSvcKey = `svc-entry-${suffix}`;
        const fromSvcPayload = {
            nfId: nfAId,
            dueDate: "2026-11-28",
            competenceDate: "2026-11-10",
            totalInstallments: 1,
        };
        const entryRes1 = await app.inject({
            method: "POST",
            url: `/finance/entries/from-service/${serviceAId}`,
            headers: {
                authorization: `Bearer ${financeToken}`,
                "idempotency-key": fromSvcKey,
            },
            payload: fromSvcPayload,
        });
        expect(entryRes1.statusCode).toBe(201);
        const entryId = entryRes1.json().entries[0].id as string;
        expect(entryRes1.json().entries[0].netAmountCents).toBe(120000);

        // Replay with identical key + payload returns cached 201 without duplicating
        const entryReplay = await app.inject({
            method: "POST",
            url: `/finance/entries/from-service/${serviceAId}`,
            headers: {
                authorization: `Bearer ${financeToken}`,
                "idempotency-key": fromSvcKey,
            },
            payload: fromSvcPayload,
        });
        expect(entryReplay.statusCode).toBe(201);
        expect(entryReplay.json().entries[0].id).toBe(entryId);

        // Same key with different payload returns 409
        const entryConflict = await app.inject({
            method: "POST",
            url: `/finance/entries/from-service/${serviceAId}`,
            headers: {
                authorization: `Bearer ${financeToken}`,
                "idempotency-key": fromSvcKey,
            },
            payload: { ...fromSvcPayload, totalInstallments: 2, installmentDueDay: 15 },
        });
        expect(entryConflict.statusCode).toBe(409);

        // 3. Partial settlement: R$ 500,00 (50000) + R$ 10,00 fee (1000) => +49000 net to account
        const settle1 = await app.inject({
            method: "POST",
            url: `/finance/entries/${entryId}/settle`,
            headers: {
                authorization: `Bearer ${financeToken}`,
                "idempotency-key": `settle-1-${suffix}`,
            },
            payload: {
                accountId,
                paymentMethod: "pix",
                settledAt: "2026-11-26T12:00:00.000Z",
                principalCents: 50000,
                gatewayFeeCents: 1000,
            },
        });
        expect(settle1.statusCode).toBe(201);
        expect(settle1.json().entry.status).toBe("partially_paid");
        expect(settle1.json().entry.settledAmountCents).toBe(50000);
        expect(settle1.json().accountCurrentBalanceCents).toBe(149000);
        const firstSettlementId = settle1.json().settlement.id as string;

        // Trying to cancel partially paid entry must fail (409)
        const cancelBlocked = await app.inject({
            method: "POST",
            url: `/finance/entries/${entryId}/cancel`,
            headers: { authorization: `Bearer ${financeToken}` },
            payload: { reason: "Tentativa indevida com baixa ativa" },
        });
        expect(cancelBlocked.statusCode).toBe(409);

        // 4. Final settlement: remaining R$ 700,00 (70000) + R$ 50,00 late interest (5000) => paid!
        const settle2 = await app.inject({
            method: "POST",
            url: `/finance/entries/${entryId}/settle`,
            headers: {
                authorization: `Bearer ${financeToken}`,
                "idempotency-key": `settle-2-${suffix}`,
            },
            payload: {
                accountId,
                paymentMethod: "boleto",
                settledAt: "2026-11-26T14:00:00.000Z",
                principalCents: 70000,
                interestCents: 5000,
            },
        });
        expect(settle2.statusCode).toBe(201);
        expect(settle2.json().entry.status).toBe("paid");
        expect(settle2.json().entry.remainingAmountCents).toBe(0);
        expect(settle2.json().accountCurrentBalanceCents).toBe(224000);

        // 5. Reverse first settlement => account drops by 49000 -> 175000, status returns to partially_paid
        const rev1 = await app.inject({
            method: "POST",
            url: `/finance/settlements/${firstSettlementId}/reverse`,
            headers: {
                authorization: `Bearer ${financeToken}`,
                "idempotency-key": `rev-1-${suffix}`,
            },
            payload: {
                reason: "PIX duplicado na conciliação",
                settledAt: "2026-11-26T15:00:00.000Z",
            },
        });
        expect(rev1.statusCode).toBe(201);
        expect(rev1.json().entry.status).toBe("partially_paid");
        expect(rev1.json().entry.settledAmountCents).toBe(70000);
        expect(rev1.json().accountCurrentBalanceCents).toBe(175000);

        // Double reversal with new key must fail (409)
        const revDup = await app.inject({
            method: "POST",
            url: `/finance/settlements/${firstSettlementId}/reverse`,
            headers: {
                authorization: `Bearer ${financeToken}`,
                "idempotency-key": `rev-2-${suffix}`,
            },
            payload: { reason: "Tentativa de duplo estorno" },
        });
        expect(revDup.statusCode).toBe(409);

        // 6. Counterparties endpoint + Cashflow, Aging and CSV export with formula-injection safety
        const colabCp = await app.inject({
            method: "GET",
            url: "/finance/counterparties",
            headers: { authorization: `Bearer ${colabToken}` },
        });
        expect(colabCp.statusCode).toBe(403);

        const cpRes = await app.inject({
            method: "GET",
            url: `/finance/counterparties?search=FinTest`,
            headers: { authorization: `Bearer ${financeToken}` },
        });
        expect(cpRes.statusCode).toBe(200);
        expect(cpRes.json().counterparties.some((c: { id: string }) => c.id === clientAId)).toBe(true);

        const categoriesRes = await app.inject({
            method: "GET",
            url: "/finance/categories",
            headers: { authorization: `Bearer ${financeToken}` },
        });
        const expenseCat = categoriesRes
            .json()
            .categories.find((c: { code: string }) => c.code === "3.02");

        // Missing clientId rejected (400) and foreign clientId rejected (404)
        const noClientRes = await app.inject({
            method: "POST",
            url: "/finance/entries",
            headers: {
                authorization: `Bearer ${financeToken}`,
                "idempotency-key": `no-client-${suffix}`,
            },
            payload: {
                entryType: "payable",
                description: "Sem cliente cadastrado",
                categoryId: expenseCat.id,
                competenceDate: "2026-11-05",
                issueDate: "2026-11-05",
                dueDate: "2026-11-10",
                originalAmountCents: 10000,
                totalInstallments: 1,
            },
        });
        expect(noClientRes.statusCode).toBe(400);

        const payableRes = await app.inject({
            method: "POST",
            url: "/finance/entries",
            headers: {
                authorization: `Bearer ${financeToken}`,
                "idempotency-key": `payable-csv-${suffix}`,
            },
            payload: {
                entryType: "payable",
                description: "=HYPERLINK(\"http://evil\") Despesa",
                clientId: clientAId,
                categoryId: expenseCat.id,
                competenceDate: "2026-11-05",
                issueDate: "2026-11-05",
                dueDate: "2026-11-10",
                originalAmountCents: 30000,
                totalInstallments: 1,
            },
        });
        expect(payableRes.statusCode).toBe(201);
        expect(payableRes.json().entries[0].counterpartyName).toContain("Cliente FinTest");

        // Installments > 1 requires installmentDueDay and generates exact fixed-day due dates
        const instMissingDay = await app.inject({
            method: "POST",
            url: "/finance/entries",
            headers: {
                authorization: `Bearer ${financeToken}`,
                "idempotency-key": `inst-noday-${suffix}`,
            },
            payload: {
                entryType: "payable",
                description: "Assinatura sem dia",
                clientId: clientAId,
                categoryId: expenseCat.id,
                competenceDate: "2027-01-01",
                issueDate: "2027-01-01",
                dueDate: "2027-01-05",
                originalAmountCents: 60000,
                totalInstallments: 3,
            },
        });
        expect(instMissingDay.statusCode).toBe(400);

        const instOk = await app.inject({
            method: "POST",
            url: "/finance/entries",
            headers: {
                authorization: `Bearer ${financeToken}`,
                "idempotency-key": `inst-ok-${suffix}`,
            },
            payload: {
                entryType: "payable",
                description: "Assinatura Pro",
                clientId: clientAId,
                categoryId: expenseCat.id,
                competenceDate: "2027-01-01",
                issueDate: "2027-01-01",
                dueDate: "2027-01-05",
                originalAmountCents: 60000,
                totalInstallments: 3,
                installmentDueDay: 10,
            },
        });
        expect(instOk.statusCode).toBe(201);
        expect(
            instOk.json().entries.map((e: { dueDate: string }) => e.dueDate),
        ).toEqual(["2027-01-10", "2027-02-10", "2027-03-10"]);

        const cashflowRes = await app.inject({
            method: "GET",
            url: "/finance/reports/cashflow?from=2026-11-01&to=2026-11-30",
            headers: { authorization: `Bearer ${financeToken}` },
        });
        expect(cashflowRes.statusCode).toBe(200);
        const cf = cashflowRes.json().summary;
        expect(cf.currentAccountsBalanceCents).toBe(175000);
        expect(cf.realizedInflowCents).toBe(75000);
        expect(cf.projectedInflowCents).toBe(50000);
        expect(cf.projectedOutflowCents).toBe(30000);

        const agingRes = await app.inject({
            method: "GET",
            url: "/finance/reports/aging?referenceDate=2026-11-26",
            headers: { authorization: `Bearer ${financeToken}` },
        });
        expect(agingRes.statusCode).toBe(200);
        expect(agingRes.json().receivable.upcomingCents).toBe(50000);
        expect(agingRes.json().payable.overdue16to30Cents).toBe(30000);

        const exportRes = await app.inject({
            method: "GET",
            url: "/finance/reports/export",
            headers: { authorization: `Bearer ${financeToken}` },
        });
        expect(exportRes.statusCode).toBe(200);
        expect(exportRes.headers["content-type"]).toContain("text/csv");
        expect(exportRes.body).toContain(`"'=HYPERLINK(""http://evil"") Despesa"`);

        // 7. Cross-tenant isolation: user from Company B cannot read or mutate Company A's entry
        const crossRead = await app.inject({
            method: "GET",
            url: `/finance/entries/${entryId}`,
            headers: { authorization: `Bearer ${otherCompToken}` },
        });
        expect(crossRead.statusCode).toBe(404);

        const crossHeader = await app.inject({
            method: "GET",
            url: "/finance/accounts",
            headers: {
                authorization: `Bearer ${otherCompToken}`,
                "x-company-id": companyAId,
            },
        });
        expect(crossHeader.statusCode).toBe(403);
    });

    it("enforces P1, P2 and P3 security & integrity hardening regressions", async () => {
        const catsRes = await app.inject({
            method: "GET",
            url: "/finance/categories",
            remoteAddress: "198.51.100.201",
            headers: { authorization: `Bearer ${financeToken}` },
        });
        const revCat = catsRes
            .json()
            .categories.find((c: { code: string }) => c.code === "1.01");

        // P1: Negative initial balance for credit_card succeeds (201) instead of 500
        const creditAccRes = await app.inject({
            method: "POST",
            url: "/finance/accounts",
            remoteAddress: "198.51.100.202",
            headers: { authorization: `Bearer ${financeToken}` },
            payload: {
                name: "Cartão Corporativo Teste",
                type: "credit_card",
                initialBalanceCents: -50000,
                initialBalanceDate: "2026-11-01",
            },
        });
        expect(creditAccRes.statusCode).toBe(201);
        expect(creditAccRes.json().account.currentBalanceCents).toBe(-50000);
        const creditAccId = creditAccRes.json().account.id as string;

        // P1: Cross-tenant counterpartyCompanyId returns 404 (no oracle) & non-intercompany returns 400
        const crossCp = await app.inject({
            method: "POST",
            url: "/finance/entries",
            remoteAddress: "198.51.100.203",
            headers: {
                authorization: `Bearer ${financeToken}`,
                "idempotency-key": `reg-cross-cp-${suffix}`,
            },
            payload: {
                entryType: "receivable",
                description: "Tentativa intercompany indevida",
                clientId: clientAId,
                categoryId: revCat.id,
                competenceDate: "2026-11-01",
                issueDate: "2026-11-01",
                dueDate: "2026-11-28",
                originalAmountCents: 10000,
                isIntercompany: true,
                counterpartyCompanyId: companyBId,
            },
        });
        expect(crossCp.statusCode).toBe(404);

        const missingFlagCp = await app.inject({
            method: "POST",
            url: "/finance/entries",
            remoteAddress: "198.51.100.204",
            headers: {
                authorization: `Bearer ${financeToken}`,
                "idempotency-key": `reg-flag-cp-${suffix}`,
            },
            payload: {
                entryType: "receivable",
                description: "Contraparte sem flag",
                clientId: clientAId,
                categoryId: revCat.id,
                competenceDate: "2026-11-01",
                issueDate: "2026-11-01",
                dueDate: "2026-11-28",
                originalAmountCents: 10000,
                isIntercompany: false,
                counterpartyCompanyId: companyBId,
            },
        });
        expect(missingFlagCp.statusCode).toBe(400);

        // P1: System category kind mutation blocked (409) and parentId cycle blocked (400)
        const sysCatPatch = await app.inject({
            method: "PATCH",
            url: `/finance/categories/${revCat.id}`,
            remoteAddress: "198.51.100.205",
            headers: { authorization: `Bearer ${financeToken}` },
            payload: { kind: "operating_expense" },
        });
        expect(sysCatPatch.statusCode).toBe(409);

        const c1 = await app.inject({
            method: "POST",
            url: "/finance/categories",
            remoteAddress: "198.51.100.206",
            headers: { authorization: `Bearer ${financeToken}` },
            payload: { name: "Cat Reg 1", kind: "operating_expense" },
        });
        const c2 = await app.inject({
            method: "POST",
            url: "/finance/categories",
            remoteAddress: "198.51.100.207",
            headers: { authorization: `Bearer ${financeToken}` },
            payload: { name: "Cat Reg 2", kind: "operating_expense" },
        });
        const c1Id = c1.json().category.id as string;
        const c2Id = c2.json().category.id as string;
        expect(
            (
                await app.inject({
                    method: "PATCH",
                    url: `/finance/categories/${c1Id}`,
                    remoteAddress: "198.51.100.208",
                    headers: { authorization: `Bearer ${financeToken}` },
                    payload: { parentId: c2Id },
                })
            ).statusCode,
        ).toBe(200);
        expect(
            (
                await app.inject({
                    method: "PATCH",
                    url: `/finance/categories/${c2Id}`,
                    remoteAddress: "198.51.100.209",
                    headers: { authorization: `Bearer ${financeToken}` },
                    payload: { parentId: c1Id },
                })
            ).statusCode,
        ).toBe(400);

        // P1: Invalid calendar dates rejected with 400
        expect(
            (
                await app.inject({
                    method: "GET",
                    url: "/finance/reports/aging?referenceDate=2026-99-99",
                    remoteAddress: "198.51.100.210",
                    headers: { authorization: `Bearer ${financeToken}` },
                })
            ).statusCode,
        ).toBe(400);
        expect(
            (
                await app.inject({
                    method: "GET",
                    url: "/finance/reports/cashflow?from=2026-02-31&to=2026-03-01",
                    remoteAddress: "198.51.100.211",
                    headers: { authorization: `Bearer ${financeToken}` },
                })
            ).statusCode,
        ).toBe(400);

        // P1: Inactive/anonymized client blocked and post-settlement client change blocked
        const [anonClient] = await db
            .insert(clients)
            .values({
                companyId: companyAId,
                registeredCompanyName: `Anon Reg ${suffix}`,
                tradeName: `Anon Reg ${suffix}`,
                cpf: `ANON-${suffix.slice(-8)}`,
                active: false,
                anonymizedAt: new Date(),
            })
            .returning();

        const [secondClient] = await db
            .insert(clients)
            .values({
                companyId: companyAId,
                registeredCompanyName: `Cliente Reg 2 ${suffix}`,
                tradeName: `Cliente Reg 2 ${suffix}`,
                cnpj: `66${suffix.slice(-12)}`,
                active: true,
            })
            .returning();

        const regEntry1 = await app.inject({
            method: "POST",
            url: "/finance/entries",
            remoteAddress: "198.51.100.212",
            headers: {
                authorization: `Bearer ${financeToken}`,
                "idempotency-key": `reg-entry-1-${suffix}`,
            },
            payload: {
                entryType: "receivable",
                description: "Regressão Contraparte",
                clientId: clientAId,
                categoryId: revCat.id,
                competenceDate: "2026-11-01",
                issueDate: "2026-11-01",
                dueDate: "2026-11-28",
                originalAmountCents: 20000,
            },
        });
        const regEntry2 = await app.inject({
            method: "POST",
            url: "/finance/entries",
            remoteAddress: "198.51.100.213",
            headers: {
                authorization: `Bearer ${financeToken}`,
                "idempotency-key": `reg-entry-2-${suffix}`,
            },
            payload: {
                entryType: "receivable",
                description: "Regressão Idempotência",
                clientId: clientAId,
                categoryId: revCat.id,
                competenceDate: "2026-11-01",
                issueDate: "2026-11-01",
                dueDate: "2026-11-28",
                originalAmountCents: 20000,
            },
        });
        const regEntry1Id = regEntry1.json().entries[0].id as string;
        const regEntry2Id = regEntry2.json().entries[0].id as string;

        expect(
            (
                await app.inject({
                    method: "PATCH",
                    url: `/finance/entries/${regEntry1Id}`,
                    remoteAddress: "198.51.100.214",
                    headers: { authorization: `Bearer ${financeToken}` },
                    payload: { clientId: anonClient.id },
                })
            ).statusCode,
        ).toBe(404);

        const sharedSettleKey = `reg-shared-settle-${suffix}`;
        expect(
            (
                await app.inject({
                    method: "POST",
                    url: `/finance/entries/${regEntry1Id}/settle`,
                    remoteAddress: "198.51.100.215",
                    headers: {
                        authorization: `Bearer ${financeToken}`,
                        "idempotency-key": sharedSettleKey,
                    },
                    payload: {
                        accountId: creditAccId,
                        paymentMethod: "pix",
                        principalCents: 5000,
                    },
                })
            ).statusCode,
        ).toBe(201);

        expect(
            (
                await app.inject({
                    method: "PATCH",
                    url: `/finance/entries/${regEntry1Id}`,
                    remoteAddress: "198.51.100.216",
                    headers: { authorization: `Bearer ${financeToken}` },
                    payload: { clientId: secondClient.id },
                })
            ).statusCode,
        ).toBe(409);

        // P2: Cross-entry reuse of Idempotency-Key in settle returns 409 (not 500)
        expect(
            (
                await app.inject({
                    method: "POST",
                    url: `/finance/entries/${regEntry2Id}/settle`,
                    remoteAddress: "198.51.100.217",
                    headers: {
                        authorization: `Bearer ${financeToken}`,
                        "idempotency-key": sharedSettleKey,
                    },
                    payload: {
                        accountId: creditAccId,
                        paymentMethod: "pix",
                        principalCents: 5000,
                    },
                })
            ).statusCode,
        ).toBe(409);

        // P2: Domain monetary math violations return 400 (not 500)
        expect(
            (
                await app.inject({
                    method: "POST",
                    url: "/finance/entries",
                    remoteAddress: "198.51.100.218",
                    headers: {
                        authorization: `Bearer ${financeToken}`,
                        "idempotency-key": `reg-disc-${suffix}`,
                    },
                    payload: {
                        entryType: "receivable",
                        description: "Desconto excedente",
                        clientId: clientAId,
                        categoryId: revCat.id,
                        competenceDate: "2026-11-01",
                        issueDate: "2026-11-01",
                        dueDate: "2026-11-28",
                        originalAmountCents: 1000,
                        discountCents: 1500,
                    },
                })
            ).statusCode,
        ).toBe(400);

        expect(
            (
                await app.inject({
                    method: "POST",
                    url: "/finance/entries",
                    remoteAddress: "198.51.100.219",
                    headers: {
                        authorization: `Bearer ${financeToken}`,
                        "idempotency-key": `reg-tiny-${suffix}`,
                    },
                    payload: {
                        entryType: "receivable",
                        description: "Parcela sub-centavo",
                        clientId: clientAId,
                        categoryId: revCat.id,
                        competenceDate: "2026-11-01",
                        issueDate: "2026-11-01",
                        dueDate: "2026-11-28",
                        originalAmountCents: 10,
                        totalInstallments: 20,
                        installmentDueDay: 10,
                    },
                })
            ).statusCode,
        ).toBe(400);

        // P2: Cross-service NF linking mismatch blocked (409)
        const [otherService] = await db
            .insert(services)
            .values({
                companyId: companyAId,
                serviceName: "Serviço Secundário",
                price: "500.00",
                initialDate: "2026-11-01",
                clientId: clientAId,
                details: "Outro serviço",
                active: true,
            })
            .returning();

        expect(
            (
                await app.inject({
                    method: "POST",
                    url: `/finance/entries/from-service/${otherService.id}`,
                    remoteAddress: "198.51.100.220",
                    headers: {
                        authorization: `Bearer ${financeToken}`,
                        "idempotency-key": `reg-nf-mismatch-${suffix}`,
                    },
                    payload: { nfId: nfAId },
                })
            ).statusCode,
        ).toBe(409);

        // P2: Public request-code returns uniform 200 without email/CNPJ oracle
        const pubExistingEmail = await app.inject({
            method: "POST",
            url: "/public/company-requests/request-code",
            remoteAddress: "198.51.100.221",
            payload: {
                email: `fintest.fin.${suffix}@example.test`,
                name: "Probe",
            },
        });
        expect(pubExistingEmail.statusCode).toBe(200);

        const [compAInfo] = await db
            .select({ cnpj: companies.cnpj })
            .from(companies)
            .where(eq(companies.id, companyAId))
            .limit(1);

        const pubExistingCnpj = await app.inject({
            method: "POST",
            url: "/public/company-requests/request-code",
            remoteAddress: "198.51.100.222",
            payload: {
                email: `unused.${suffix}@example.test`,
                cnpj: compAInfo.cnpj,
                name: "Probe",
            },
        });
        expect(pubExistingCnpj.statusCode).toBe(200);
        expect(pubExistingEmail.json().message).toBe(pubExistingCnpj.json().message);

        // P3: Export endpoint returns private, no-store Cache-Control header
        const exportP3 = await app.inject({
            method: "GET",
            url: "/finance/reports/export",
            remoteAddress: "198.51.100.223",
            headers: { authorization: `Bearer ${financeToken}` },
        });
        expect(exportP3.statusCode).toBe(200);
        expect(exportP3.headers["cache-control"]).toBe("private, no-store");
    });
});

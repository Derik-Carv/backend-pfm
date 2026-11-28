import { db } from "@/database/index";
import { companies, roles, userCompanies, users } from "@/database/schema/schema";
import { CompaniesRepository } from "@/database/tables/companies/companies.repository";
import { UserCompaniesRepository } from "@/database/tables/userCompanies/userCompanies.repository";
import { hashPassword } from "@/lib/hash";
import { maskCpf } from "@/lib/lgpd/legal.constants";
import { cnpjClean, cnpjValidate, maskTenantDocument } from "@/utils/checkCnpj";
import { cpfClean, cpfValidateNormal } from "@/utils/checkCpf";
import { generateNick, slugifyCompanyName } from "@/utils/createNick";
import { and, desc, eq, inArray, ne, sql } from "drizzle-orm";
import type {
    CreateMotherCompanyInput,
    CreateBranchCompanyInput,
    UpdateCompanyInput,
    UpdateMyCompanySettingsInput,
    CreateCompanyUserInput,
    UpdateCompanyUserInput,
} from "./companies.schemas";

export async function resolveUniqueUsername(
    baseUsername: string,
    isExplicit: boolean,
): Promise<string> {
    const [existing] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.username, baseUsername))
        .limit(1);

    if (!existing) {
        return baseUsername;
    }

    if (isExplicit) {
        throw new Error("USERNAME_ALREADY_EXISTS");
    }

    for (let suffix = 2; suffix < 1000; suffix++) {
        const candidate = `${baseUsername}.${suffix}`;
        const [taken] = await db
            .select({ id: users.id })
            .from(users)
            .where(eq(users.username, candidate))
            .limit(1);
        if (!taken) {
            return candidate;
        }
    }

    throw new Error("USERNAME_ALREADY_EXISTS");
}

export function serializeCompanySafe<
    T extends { cnpj: string; accountType?: string | null },
>(company: T) {
    return {
        ...company,
        accountType:
            company.accountType === "personal"
                ? ("personal" as const)
                : ("business" as const),
        cnpj: maskTenantDocument(company.cnpj, company.accountType),
    };
}

export async function usecaseCreateMotherCompany(
    data: CreateMotherCompanyInput,
    creatorUserId: string,
) {
    const companiesRepo = new CompaniesRepository();
    const userCompaniesRepo = new UserCompaniesRepository();

    const cleanedCnpj = cnpjClean(data.cnpj);
    if (!cnpjValidate(cleanedCnpj)) {
        throw new Error("INVALID_CNPJ");
    }

    const existing = await companiesRepo.findByCnpj(cleanedCnpj);
    if (existing) {
        throw new Error("COMPANY_CNPJ_ALREADY_EXISTS");
    }

    let adminUsername: string | undefined;
    let cleanedAdminCpf: string | undefined;
    let companyAdminRoleId: string | undefined;

    if (data.admin) {
        cleanedAdminCpf = cpfClean(data.admin.cpf);
        if (!(await cpfValidateNormal(cleanedAdminCpf))) {
            throw new Error("INVALID_CPF");
        }

        const [cpfTaken] = await db
            .select({ id: users.id })
            .from(users)
            .where(eq(users.cpf, cleanedAdminCpf))
            .limit(1);
        if (cpfTaken) {
            throw new Error("CPF_ALREADY_EXISTS");
        }

        const [emailTaken] = await db
            .select({ id: users.id })
            .from(users)
            .where(sql`lower(${users.email}) = ${data.admin.email}`)
            .limit(1);
        if (emailTaken) {
            throw new Error("EMAIL_ALREADY_EXISTS");
        }

        const [companyAdminRole] = await db
            .select({ id: roles.id })
            .from(roles)
            .where(and(eq(roles.name, "company_admin"), eq(roles.active, true)))
            .limit(1);
        if (!companyAdminRole) {
            throw new Error("ROLE_NOT_FOUND");
        }
        companyAdminRoleId = companyAdminRole.id;

        const desiredUsername = data.admin.username
            ? data.admin.username.trim().toLowerCase()
            : `administrator.${slugifyCompanyName(data.tradeName)}`;
        adminUsername = await resolveUniqueUsername(
            desiredUsername,
            Boolean(data.admin.username),
        );
    }

    const newCompany = await companiesRepo.create({
        registeredCompanyName: data.registeredCompanyName,
        tradeName: data.tradeName,
        cnpj: cleanedCnpj,
        accountType: "business",
        email: data.email,
        phone: data.phone,
        motherId: null,
        active: true,
    });

    await userCompaniesRepo.create({
        userId: creatorUserId,
        companyId: newCompany.id,
        isDefault: false,
    });

    let adminUser: { id: string; username: string; role: string } | undefined;

    if (data.admin && adminUsername && cleanedAdminCpf && companyAdminRoleId) {
        const hashedPassword = await hashPassword(data.admin.password);
        const [createdAdmin] = await db
            .insert(users)
            .values({
                name: data.admin.name.trim(),
                surname: data.admin.surname.trim(),
                username: adminUsername,
                email: data.admin.email,
                emailVerified: true,
                password: hashedPassword,
                roleId: companyAdminRoleId,
                primaryCompanyId: newCompany.id,
                cpf: cleanedAdminCpf,
                active: true,
                passwordChangeRequired: true,
            })
            .returning({
                id: users.id,
                username: users.username,
            });

        await userCompaniesRepo.create({
            userId: createdAdmin.id,
            companyId: newCompany.id,
            isDefault: true,
        });

        adminUser = {
            id: createdAdmin.id,
            username: createdAdmin.username,
            role: "company_admin",
        };
    }

    return { company: newCompany, adminUser };
}

export async function usecaseUpdateMotherCompany(
    id: string,
    data: UpdateCompanyInput,
) {
    const companiesRepo = new CompaniesRepository();
    const target = await companiesRepo.findById(id);

    if (!target || target.motherId !== null) {
        throw new Error("MOTHER_COMPANY_NOT_FOUND");
    }

    const updated = await companiesRepo.update(id, data);
    if (!updated) {
        throw new Error("MOTHER_COMPANY_NOT_FOUND");
    }

    return updated;
}

export async function usecaseUpdateMyCompanySettings(
    companyId: string,
    data: UpdateMyCompanySettingsInput,
) {
    const companiesRepo = new CompaniesRepository();
    const target = await companiesRepo.findById(companyId);

    if (!target || !target.active) {
        throw new Error("COMPANY_NOT_FOUND");
    }

    const updated = await companiesRepo.update(companyId, {
        allowManualFinanceCodes: data.allowManualFinanceCodes,
    });
    if (!updated) {
        throw new Error("COMPANY_NOT_FOUND");
    }

    return updated;
}

export async function usecaseCreateBranchCompany(
    data: CreateBranchCompanyInput,
    motherId: string,
    userId: string,
) {
    const companiesRepo = new CompaniesRepository();
    const userCompaniesRepo = new UserCompaniesRepository();

    const mother = await companiesRepo.findById(motherId);
    if (!mother || !mother.active || mother.motherId !== null) {
        throw new Error("MOTHER_COMPANY_NOT_FOUND");
    }
    if (mother.accountType === "personal") {
        throw new Error("PERSONAL_ACCOUNT_NOT_ALLOWED");
    }

    const cleanedCnpj = cnpjClean(data.cnpj);
    if (!cnpjValidate(cleanedCnpj)) {
        throw new Error("INVALID_CNPJ");
    }

    const existing = await companiesRepo.findByCnpj(cleanedCnpj);
    if (existing) {
        throw new Error("COMPANY_CNPJ_ALREADY_EXISTS");
    }

    const newBranch = await companiesRepo.create({
        registeredCompanyName: data.registeredCompanyName,
        tradeName: data.tradeName,
        cnpj: cleanedCnpj,
        accountType: "business",
        email: data.email,
        phone: data.phone,
        motherId: mother.id,
        active: true,
    });

    await userCompaniesRepo.create({
        userId,
        companyId: newBranch.id,
        isDefault: false,
    });

    return newBranch;
}

export async function usecaseUpdateBranchCompany(
    id: string,
    data: UpdateCompanyInput,
    actorRole: string,
    actorMotherId?: string,
) {
    const companiesRepo = new CompaniesRepository();
    const target = await companiesRepo.findById(id);

    if (!target || target.motherId === null) {
        throw new Error("BRANCH_COMPANY_NOT_FOUND");
    }

    if (actorRole !== "administrator" && target.motherId !== actorMotherId) {
        throw new Error("COMPANY_ACCESS_DENIED");
    }

    const updated = await companiesRepo.update(id, data);
    if (!updated) {
        throw new Error("BRANCH_COMPANY_NOT_FOUND");
    }

    return updated;
}

export async function usecaseListMothers() {
    const companiesRepo = new CompaniesRepository();
    return await companiesRepo.findAllMothers();
}

export async function usecaseListBranches(
    motherId: string,
    includeInactive = true,
) {
    const companiesRepo = new CompaniesRepository();
    return await companiesRepo.findBranchesByMotherId(motherId, includeInactive);
}

export async function usecaseGetMyCompanies(
    userId: string,
    roleName: string,
    primaryCompanyId?: string | null,
) {
    const companiesRepo = new CompaniesRepository();
    const userCompaniesRepo = new UserCompaniesRepository();

    if (roleName === "administrator") {
        const list = await companiesRepo.findAllActive();
        return { companies: list, isMother: true };
    }

    const linkedCompanies = await userCompaniesRepo.findCompaniesByUserId(userId);
    const byId = new Map(linkedCompanies.map((c) => [c.id, c]));

    if (primaryCompanyId && !byId.has(primaryCompanyId)) {
        const primary = await companiesRepo.findById(primaryCompanyId);
        if (primary && primary.active) {
            byId.set(primary.id, primary);
        }
    }

    const directCompanies = [...byId.values()];
    const motherCompanies = directCompanies.filter((c) => c.motherId === null);

    if (roleName !== "colaborator" && motherCompanies.length > 0) {
        const branchGroups = await Promise.all(
            motherCompanies.map((m) => companiesRepo.findBranchesByMotherId(m.id, false)),
        );
        for (const branches of branchGroups) {
            for (const branch of branches) {
                byId.set(branch.id, branch);
            }
        }
        return { companies: [...byId.values()], isMother: true };
    }

    return { companies: directCompanies, isMother: false };
}

export type CompanyActorScope = {
    motherId: string;
    isMother: boolean;
    accessibleCompanyIds: string[];
    isPlatformAdmin: boolean;
};

async function resolveAllowedCompanyIdsForActor(
    scope: CompanyActorScope,
): Promise<string[]> {
    if (!scope.isPlatformAdmin && !scope.isMother) {
        return [...scope.accessibleCompanyIds];
    }

    const companiesRepo = new CompaniesRepository();
    const branches = await companiesRepo.findBranchesByMotherId(scope.motherId, true);
    return [scope.motherId, ...branches.map((b) => b.id)];
}

export async function usecaseListCompanyUsers(scope: CompanyActorScope) {
    const allowedCompanyIds = await resolveAllowedCompanyIdsForActor(scope);
    if (allowedCompanyIds.length === 0) {
        return [];
    }

    const rows = await db
        .select({
            id: users.id,
            name: users.name,
            surname: users.surname,
            username: users.username,
            email: users.email,
            cpf: users.cpf,
            roleId: users.roleId,
            roleName: roles.name,
            primaryCompanyId: users.primaryCompanyId,
            companyName: companies.tradeName,
            active: users.active,
            passwordChangeRequired: users.passwordChangeRequired,
            createdAt: users.createdAt,
        })
        .from(users)
        .innerJoin(roles, eq(users.roleId, roles.id))
        .leftJoin(companies, eq(users.primaryCompanyId, companies.id))
        .where(
            and(
                inArray(users.primaryCompanyId, allowedCompanyIds),
                ne(roles.name, "administrator"),
            ),
        )
        .orderBy(desc(users.createdAt));

    return rows.map((row) => ({
        ...row,
        cpf: maskCpf(row.cpf),
    }));
}

export async function usecaseCreateCompanyUser(
    data: CreateCompanyUserInput,
    scope: CompanyActorScope,
    defaultCompanyId: string,
) {
    if ((data.roleName as string) === "administrator") {
        throw new Error("FORBIDDEN_ROLE");
    }

    const allowedCompanyIds = await resolveAllowedCompanyIdsForActor(scope);
    const targetCompanyId = data.companyId || defaultCompanyId;

    if (!allowedCompanyIds.includes(targetCompanyId)) {
        throw new Error("COMPANY_ACCESS_DENIED");
    }

    const cleanedCpf = cpfClean(data.cpf);
    if (!/^\d{11}$/.test(cleanedCpf)) {
        throw new Error("INVALID_CPF");
    }

    const [cpfTaken] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.cpf, cleanedCpf))
        .limit(1);
    if (cpfTaken) {
        throw new Error("CPF_ALREADY_EXISTS");
    }

    const [emailTaken] = await db
        .select({ id: users.id })
        .from(users)
        .where(sql`lower(${users.email}) = ${data.email}`)
        .limit(1);
    if (emailTaken) {
        throw new Error("EMAIL_ALREADY_EXISTS");
    }

    const [targetRole] = await db
        .select()
        .from(roles)
        .where(and(eq(roles.name, data.roleName), eq(roles.active, true)))
        .limit(1);
    if (!targetRole) {
        throw new Error("ROLE_NOT_FOUND");
    }

    const companiesRepo = new CompaniesRepository();
    const targetCompany = await companiesRepo.findById(targetCompanyId);
    if (!targetCompany) {
        throw new Error("COMPANY_NOT_FOUND");
    }
    if (targetCompany.accountType === "personal") {
        throw new Error("PERSONAL_ACCOUNT_NOT_ALLOWED");
    }

    let desiredUsername: string;
    if (data.username?.trim()) {
        desiredUsername = data.username.trim().toLowerCase();
    } else if (data.roleName === "company_admin") {
        desiredUsername = `administrator.${slugifyCompanyName(targetCompany.tradeName)}`;
    } else {
        desiredUsername = generateNick(data.name, data.surname);
    }

    const finalUsername = await resolveUniqueUsername(
        desiredUsername,
        Boolean(data.username?.trim()),
    );

    const hashedPassword = await hashPassword(data.password);

    const [created] = await db
        .insert(users)
        .values({
            name: data.name.trim(),
            surname: data.surname.trim(),
            username: finalUsername,
            email: data.email,
            emailVerified: true,
            password: hashedPassword,
            roleId: targetRole.id,
            primaryCompanyId: targetCompanyId,
            cpf: cleanedCpf,
            active: true,
            passwordChangeRequired: true,
        })
        .returning();

    const userCompaniesRepo = new UserCompaniesRepository();
    await userCompaniesRepo.create({
        userId: created.id,
        companyId: targetCompanyId,
        isDefault: true,
    });

    return {
        id: created.id,
        name: created.name,
        surname: created.surname,
        username: created.username,
        email: created.email,
        cpf: maskCpf(created.cpf),
        roleId: created.roleId,
        roleName: targetRole.name,
        primaryCompanyId: created.primaryCompanyId,
        companyName: targetCompany.tradeName,
        active: created.active,
        passwordChangeRequired: created.passwordChangeRequired,
        createdAt: created.createdAt,
    };
}

export async function usecaseUpdateCompanyUser(
    targetUserId: string,
    data: UpdateCompanyUserInput,
    scope: CompanyActorScope,
) {
    if (data.roleName && (data.roleName as string) === "administrator") {
        throw new Error("FORBIDDEN_ROLE");
    }

    const allowedCompanyIds = await resolveAllowedCompanyIdsForActor(scope);

    const [existing] = await db
        .select({
            user: users,
            roleName: roles.name,
        })
        .from(users)
        .innerJoin(roles, eq(users.roleId, roles.id))
        .where(eq(users.id, targetUserId))
        .limit(1);

    if (!existing) {
        throw new Error("USER_NOT_FOUND");
    }

    if (
        existing.roleName === "administrator" ||
        !existing.user.primaryCompanyId ||
        !allowedCompanyIds.includes(existing.user.primaryCompanyId)
    ) {
        throw new Error("COMPANY_ACCESS_DENIED");
    }

    const updates: Partial<typeof users.$inferInsert> = {};

    if (data.name !== undefined) updates.name = data.name.trim();
    if (data.surname !== undefined) updates.surname = data.surname.trim();
    if (data.active !== undefined) updates.active = data.active;
    if (data.email !== undefined) {
        const [emailTaken] = await db
            .select({ id: users.id })
            .from(users)
            .where(
                and(
                    sql`lower(${users.email}) = ${data.email}`,
                    ne(users.id, targetUserId),
                ),
            )
            .limit(1);
        if (emailTaken) {
            throw new Error("EMAIL_ALREADY_EXISTS");
        }
        updates.email = data.email;
    }

    if (data.roleName !== undefined) {
        const [targetRole] = await db
            .select()
            .from(roles)
            .where(and(eq(roles.name, data.roleName), eq(roles.active, true)))
            .limit(1);
        if (!targetRole) {
            throw new Error("ROLE_NOT_FOUND");
        }
        updates.roleId = targetRole.id;
    }

    if (data.companyId !== undefined) {
        if (!allowedCompanyIds.includes(data.companyId)) {
            throw new Error("COMPANY_ACCESS_DENIED");
        }
        updates.primaryCompanyId = data.companyId;
    }

    if (data.password !== undefined) {
        updates.password = await hashPassword(data.password);
        updates.passwordChangeRequired = true;
    }

    await db.transaction(async (tx) => {
        if (data.companyId !== undefined) {
            const { userCompanies: userCompaniesTable } = await import("@/database/schema/schema");
            await tx
                .delete(userCompaniesTable)
                .where(eq(userCompaniesTable.userId, targetUserId));
            await tx.insert(userCompaniesTable).values({
                userId: targetUserId,
                companyId: data.companyId,
                isDefault: true,
            });
        }

        if (Object.keys(updates).length > 0 || data.password !== undefined) {
            await tx
                .update(users)
                .set({
                    ...updates,
                    ...(data.password !== undefined
                        ? { tokenVersion: sql`${users.tokenVersion} + 1` }
                        : {}),
                })
                .where(eq(users.id, targetUserId));
        }
    });

    const [updated] = await db
        .select({
            id: users.id,
            name: users.name,
            surname: users.surname,
            username: users.username,
            email: users.email,
            cpf: users.cpf,
            roleId: users.roleId,
            roleName: roles.name,
            primaryCompanyId: users.primaryCompanyId,
            companyName: companies.tradeName,
            active: users.active,
            passwordChangeRequired: users.passwordChangeRequired,
            createdAt: users.createdAt,
        })
        .from(users)
        .innerJoin(roles, eq(users.roleId, roles.id))
        .leftJoin(companies, eq(users.primaryCompanyId, companies.id))
        .where(eq(users.id, targetUserId))
        .limit(1);

    return updated
        ? {
              ...updated,
              cpf: maskCpf(updated.cpf),
          }
        : undefined;
}

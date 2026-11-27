import { db } from "@/database/index";
import { roles, users, statusService, type, companies, userCompanies } from "@/database/schema/schema";
import { ensureDefaultFinancialCategories } from "@/lib/finance/defaultCategories";
import { cpfClean } from "@/utils/checkCpf";
import { hashPassword } from "@/lib/hash";
import { eq } from "drizzle-orm";

export async function startSeed() {
    console.log(
        "🌱 Iniciando verificação e seed essencial do banco de dados...",
    );

    // 0. Seed da Mother Company padrão
    const defaultMotherId = "018f0000-0000-7000-8000-000000000001";
    const [existingMother] = await db
        .select()
        .from(companies)
        .where(eq(companies.id, defaultMotherId))
        .limit(1);

    if (!existingMother) {
        console.log("🏢 Criando Mother Company padrão...");
        await db.insert(companies).values({
            id: defaultMotherId,
            registeredCompanyName: "Empresa Matriz Principal",
            tradeName: "Matriz Principal",
            cnpj: "00000000000191",
            active: true,
        });
        console.log("✅ Mother Company padrão criada.");
    }

    await ensureDefaultFinancialCategories(defaultMotherId);

    const targetRoles = [
        "administrator",
        "company_admin",
        "manager",
        "finance",
        "observer",
        "colaborator",
    ];

    for (const roleName of targetRoles) {
        const [existingRole] = await db
            .select()
            .from(roles)
            .where(eq(roles.name, roleName))
            .limit(1);

        if (!existingRole) {
            const [newRole] = await db
                .insert(roles)
                .values({ name: roleName })
                .returning({ id: roles.id });
            console.log(`✅ Role '${roleName}' criada.`);
        }
    }

    const adminUsername = "administrator.system";

    const [administratorRole] = await db
        .select({ id: roles.id })
        .from(roles)
        .where(eq(roles.name, "administrator"))
        .limit(1);

    if (!administratorRole) {
        throw new Error("ADMINISTRATOR_ROLE_SEED_FAILED");
    }

    const [existingUser] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.username, adminUsername))
        .limit(1);

    if (!existingUser) {
        const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD;
        const adminCpf = process.env.CPFADMIN?.trim();

        if (!adminPassword?.trim() || !adminCpf) {
            throw new Error(
                "ADMIN_DEFAULT_PASSWORD and CPFADMIN are required to seed the administrator",
            );
        }

        const isProd = (Bun.env.NODE_ENV ?? process.env.NODE_ENV) === "production";
        if (isProd && /^change-me/i.test(adminPassword.trim())) {
            throw new Error(
                "ADMIN_DEFAULT_PASSWORD must not use a placeholder value in production",
            );
        }

        console.log("👤 Criando usuário admin padrão...");
        const cpf = await cpfClean(adminCpf);
        const hashedPassword = await hashPassword(adminPassword);

        await db.transaction(async (tx) => {
            const [createdAdmin] = await tx
                .insert(users)
                .values({
                    name: "administrator",
                    surname: "system",
                    username: adminUsername,
                    password: hashedPassword,
                    roleId: administratorRole.id,
                    primaryCompanyId: defaultMotherId,
                    cpf: cpf,
                    active: true,
                    passwordChangeRequired: true,
                })
                .returning({ id: users.id });

            await tx.insert(userCompanies).values({
                userId: createdAdmin.id,
                companyId: defaultMotherId,
                isDefault: true,
            });
        });
        console.log("✅ Usuário admin criado e vinculado à Mother Company padrão.");
    }

    const defaultStatuses = ["Fila", "Em Andamento", "Finalizado"];
    for (const statusName of defaultStatuses) {
        const [existing] = await db
            .select()
            .from(statusService)
            .where(eq(statusService.name, statusName))
            .limit(1);

        if (!existing) {
            await db
                .insert(statusService)
                .values({ name: statusName, active: true });
            console.log(`✅ Status '${statusName}' criado.`);
        }
    }

    const defaultTypes = ["Serviço Prestado", "Aquisição de Material"];
    for (const typeName of defaultTypes) {
        const [existing] = await db
            .select()
            .from(type)
            .where(eq(type.name, typeName))
            .limit(1);

        if (!existing) {
            await db.insert(type).values({ name: typeName, active: true });
            console.log(`✅ Tipo '${typeName}' criado.`);
        }
    }

    console.log(
        "✅ Seed essencial finalizado: roles, administrador, status de serviço e tipos de NF.",
    );
}

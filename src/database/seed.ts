import { db } from "@/database/index";
import { roles, users, statusService, type } from "@/database/schema/schema";
import { cpfClean } from "@/utils/checkCpf";
import { hashPassword } from "@/lib/hash";
import { eq } from "drizzle-orm";

export async function startSeed() {
    console.log(
        "🌱 Iniciando verificação e seed essencial do banco de dados...",
    );

    const targetRoles = [
        "administrator",
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
    const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD;
    const adminCpf = process.env.CPFADMIN;

    if (!adminPassword || !adminCpf) {
        throw new Error(
            "ADMIN_DEFAULT_PASSWORD and CPFADMIN are required to seed the administrator",
        );
    }

    const [administratorRole] = await db
        .select({ id: roles.id })
        .from(roles)
        .where(eq(roles.name, "administrator"))
        .limit(1);

    if (!administratorRole) {
        throw new Error("ADMINISTRATOR_ROLE_SEED_FAILED");
    }

    const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.username, adminUsername))
        .limit(1);

    if (!existingUser) {
        console.log("👤 Criando usuário admin padrão...");
        const cpf = await cpfClean(adminCpf);
        const hashedPassword = await hashPassword(adminPassword);

        await db.insert(users).values({
            name: "administrator",
            surname: "system",
            username: adminUsername,
            password: hashedPassword,
            roleId: administratorRole.id,
            cpf: cpf,
            active: true,
            passwordChangeRequired: true,
        });
        console.log("✅ Usuário admin criado.");
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

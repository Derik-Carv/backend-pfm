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

    const roleMap: Record<string, string> = {};

    for (const roleName of targetRoles) {
        let [existingRole] = await db
            .select()
            .from(roles)
            .where(eq(roles.name, roleName))
            .limit(1);

        if (!existingRole) {
            const [newRole] = await db
                .insert(roles)
                .values({ name: roleName })
                .returning({ id: roles.id });
            roleMap[roleName] = newRole.id;
            console.log(`✅ Role '${roleName}' criada.`);
        } else {
            roleMap[roleName] = existingRole.id;
        }
    }

    const adminUsername = "administrator.system";
    let [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.username, adminUsername))
        .limit(1);

    if (!existingUser) {
        console.log("👤 Criando usuário admin padrão...");
        const cpf = await cpfClean(process.env.CPFADMIN as string);
        const rawPassword = process.env.ADMIN_DEFAULT_PASSWORD as string;
        const hashedPassword = await hashPassword(rawPassword);

        await db.insert(users).values({
            name: "administrator",
            surname: "system",
            username: adminUsername,
            password: hashedPassword,
            roleId: roleMap["administrator"],
            cpf: cpf,
            active: true,
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

    console.log("✅ Seed essencial finalizado com sucesso!");
}

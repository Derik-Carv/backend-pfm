import {
    createRoleRepository,
    getRoleForNameRepository,
} from "@/database/roles/roles.repository";
import {
    createUserRepository,
    getCompareUsernameRepository,
} from "@/database/users/users.repository";
import { cpfClean } from "@/utils/checkCpf";
import { hashPassword } from "@/lib/hash";

export async function startSeed() {
    const adminRoleName = "administrator";
    const adminName = "administrator";
    const adminSurname = "system";
    const adminUsername = "administrator.system";
    const cpf = await cpfClean(process.env.CPFADMIN as string);
    const rawPassword = process.env.ADMIN_DEFAULT_PASSWORD as string;

    let adminRole = await getRoleForNameRepository(adminRoleName);

    if (!adminRole) adminRole = await createRoleRepository(adminRoleName);

    const existingUser = await getCompareUsernameRepository(adminUsername);

    if (existingUser) {
        console.log("admin user already exists");
        return;
    }

    console.log("👤 Criando usuário admin padrão...");
    const hashedPassword = await hashPassword(rawPassword);

    const data = {
        name: adminName,
        surname: adminSurname,
        username: adminUsername,
        password: hashedPassword,
        roleId: adminRole.id,
        cpf: cpf,
    };

    await createUserRepository(data);
    console.log("admin user created with sucess");
}

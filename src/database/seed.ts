import { RoleRepository } from "@/database/tables/roles/roles.repository";
import { UsersRepository } from "@/database/tables/users/users.repository";
import { cpfClean } from "@/utils/checkCpf";
import { hashPassword } from "@/lib/hash";

export async function startSeed() {
    const roleRepo = new RoleRepository();
    const userRepository = new UsersRepository();

    const adminRoleName = "administrator";
    const adminName = "administrator";
    const adminSurname = "system";
    const adminUsername = "administrator.system";
    const cpf = await cpfClean(process.env.CPFADMIN as string);
    const rawPassword = process.env.ADMIN_DEFAULT_PASSWORD as string;

    let adminRole = await roleRepo.findByName(adminRoleName);

    const createRole = { name: adminRoleName };

    if (!adminRole) adminRole = await roleRepo.create(createRole);

    const existingUser = await userRepository.findUsername(adminUsername);

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
        active: true,
    };

    await userRepository.create(data);
    console.log("admin user created with sucess");
}

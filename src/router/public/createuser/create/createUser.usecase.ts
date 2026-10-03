import { RoleRepository } from "@/database/tables/roles/roles.repository";
import { UsersRepository } from "@/database/tables/users/users.repository";
import { hashPassword } from "@/lib/hash";
import { cpfValidateNormal } from "@/utils/checkCpf";
import { generateNick } from "@/utils/createNick";
import type { CreateUserInput } from "@/router/public/createuser/user.schemas";
import { allRoles } from "@/lib/roles.list";

export async function usecaseCreateUser(data: CreateUserInput) {
    const UserRepository = new UsersRepository();
    const roleDefaultRepository = new RoleRepository();
    const validCpf = await cpfValidateNormal(data.cpf);
    if (!validCpf) {
        throw new Error("INVALID_CPF");
    }

    const serverCreateNick = await generateNick(data.name, data.surname);
    const serverValidNick = await UserRepository.findUsername(serverCreateNick);
    const clientValidNick = await UserRepository.findUsername(data.username);

    if (
        serverValidNick !== clientValidNick &&
        (clientValidNick || serverValidNick)
    ) {
        throw new Error("INVALID_USERNAME");
    }

    const defaultRole = await roleDefaultRepository.findByName(
        allRoles.colaborator,
    );

    const newPassword = await hashPassword(data.password);

    if (!defaultRole) {
        throw new Error("ROLE_NOT_FOUND");
    }

    const createdUserData = {
        name: data.name,
        surname: data.surname,
        username: serverCreateNick,
        password: newPassword,
        cpf: data.cpf,
        roleId: defaultRole.id,
    };

    const newUser = await UserRepository.create(createdUserData);

    return {
        message: "User registered successfully",
        user: {
            name: newUser.name,
            surname: newUser.surname,
            username: newUser.username,
            role: defaultRole.name,
            cpf: newUser.cpf,
            active: newUser.active,
            createdAt: newUser.createdAt ?? new Date(),
        },
    };
}

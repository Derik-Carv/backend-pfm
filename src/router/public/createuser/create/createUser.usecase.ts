import { getRoleForidRepository } from "@/database/tables/roles/roles.repository";
import {
    createUserRepository,
    getCompareUsernameRepository,
} from "@/database/tables/users/users.repository";
import { hashPassword } from "@/lib/hash";
import { cpfValidateNormal } from "@/utils/checkCpf";
import { generateNick } from "@/utils/createNick";
import type { CreateUserInput } from "@/router/public/createuser/user.schemas";

export async function usecaseCreateUser(data: CreateUserInput) {
    const validCpf = await cpfValidateNormal(data.cpf);
    if (!validCpf) {
        throw new Error("INVALID_CPF");
    }

    const serverCreateNick = await generateNick(data.name, data.surname);
    const serverValidNick =
        await getCompareUsernameRepository(serverCreateNick);
    const clientValidNick = await getCompareUsernameRepository(data.username);

    if (
        serverValidNick !== clientValidNick &&
        (clientValidNick || serverValidNick)
    ) {
        throw new Error("INVALID_USERNAME");
    }

    const roleName = await getRoleForidRepository(data.roleId);
    if (!roleName) {
        throw new Error("ROLE_NOT_FOUND");
    }

    const newPassword = await hashPassword(data.password);

    const createdUserData = {
        name: data.name,
        surname: data.surname,
        username: serverCreateNick,
        password: newPassword,
        cpf: data.cpf,
        roleId: data.roleId,
    };

    const newUser = await createUserRepository(createdUserData);

    return {
        message: "User registered successfully",
        user: {
            name: newUser.name,
            surname: newUser.surname,
            username: newUser.username,
            role: roleName.name,
            cpf: newUser.cpf,
            createdAt: newUser.createdAt ?? new Date(),
        },
    };
}

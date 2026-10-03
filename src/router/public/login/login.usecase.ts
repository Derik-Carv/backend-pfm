import { UsersRepository } from "@/database/tables/users/users.repository";
import { RoleRepository } from "@/database/tables/roles/roles.repository";
import type { LoginUserInput } from "@/router/public/login/login.schemas";
import { verifyPassword } from "@/lib/hash";

export async function usecaseLogin(data: LoginUserInput) {
    const { username, password } = data;
    if (!username || !password)
        throw new Error("USERNAME_OR_PASSOWORD_INVALID");

    const userRepository = new UsersRepository();

    const validUsername = await userRepository.findUsername(username);

    if (!validUsername) throw new Error("USERNAME_OR_PASSOWORD_INVALID");

    const validPassword = await verifyPassword(password, validUsername.password);

    if (!validPassword) throw new Error("USERNAME_OR_PASSOWORD_INVALID");

    const roleRepository = new RoleRepository();
    const role = await roleRepository.findById(validUsername.roleId);

    if (!role) throw new Error("ROLE_NOT_FOUND");

    return {
        message: "login successfully",
        user: {
            id: validUsername.id,
            name: validUsername.name,
            surname: validUsername.surname,
            cpf: validUsername.cpf,
            username: validUsername.username,
            role: role.name,
        },
    };
}

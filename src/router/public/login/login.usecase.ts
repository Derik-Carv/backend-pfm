import { UsersRepository } from "@/database/tables/users/users.repository";
import type { LoginUserInput } from "@/router/public/login/login.schemas";
import { hashPassword, verifyPassword } from "@/lib/hash";

export async function usecaseLogin(data: LoginUserInput) {
    const { username, password } = data;
    if (!username || !password)
        throw new Error("USERNAME_OR_PASSOWORD_INVALID");

    const userRepository = new UsersRepository();

    const validUsername = await userRepository.findName(username);

    if (!validUsername) throw new Error("USERNAME_OR_PASSOWORD_INVALID");

    const testPassword = await hashPassword(password);
    const validPassword = await verifyPassword(password, testPassword);

    if (!validPassword) throw new Error("USERNAME_OR_PASSOWORD_INVALID");

    return {
        message: "login successfully",
        user: {
            id: validUsername.id,
            name: validUsername.name,
            surname: validUsername.surname,
            cpf: validUsername.cpf,
            username: validUsername.username,
            role: validUsername.name,
        },
    };
}

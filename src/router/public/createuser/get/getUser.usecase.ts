import { UsersRepository } from "@/database/tables/users/users.repository";

export async function usecaseGetUser() {
    const userRepository = new UsersRepository();

    const users = await userRepository.findAll();

    if (!users) {
        throw new Error("USERS_NOT_FOUND");
    }

    return users;
}

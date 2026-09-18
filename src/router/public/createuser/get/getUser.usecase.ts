import { getUsersRepository } from "@/database/users/users.repository";

export async function usecaseGetUser() {
    const users = await getUsersRepository();

    if (!users) {
        throw new Error("USERS_NOT_FOUND");
    }

    return users;
}

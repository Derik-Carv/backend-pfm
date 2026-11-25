import { UsersRepository } from "@/database/tables/users/users.repository";
import type { Users } from "@/database/tables/users/users.interface";
import { RoleRepository } from "@/database/tables/roles/roles.repository";
import type { LoginUserInput } from "@/router/public/login/login.schemas";
import { verifyPassword } from "@/lib/hash";
import { db } from "@/database/index";
import { legalAcceptances } from "@/database/schema/schema";
import { and, eq } from "drizzle-orm";
import {
    LEGAL_PRIVACY_VERSION,
    LEGAL_TERMS_VERSION,
} from "@/lib/lgpd/legal.constants";

export async function usecaseLogin(data: LoginUserInput) {
    const { username, password } = data;
    if (!username || !password)
        throw new Error("USERNAME_OR_PASSOWORD_INVALID");

    const userRepository = new UsersRepository();

    let validUsername: Users | null = await userRepository.findUsername(username);
    if (!validUsername && username.includes("@")) {
        validUsername = await userRepository.findActiveByEmail(username);
    }

    if (!validUsername) throw new Error("USERNAME_OR_PASSOWORD_INVALID");

    const validPassword = await verifyPassword(password, validUsername.password);

    if (!validPassword) throw new Error("USERNAME_OR_PASSOWORD_INVALID");

    const roleRepository = new RoleRepository();
    const role = await roleRepository.findById(validUsername.roleId);

    if (!role) throw new Error("ROLE_NOT_FOUND");

    const acceptances = await db
        .select({
            documentType: legalAcceptances.documentType,
            documentVersion: legalAcceptances.documentVersion,
        })
        .from(legalAcceptances)
        .where(eq(legalAcceptances.userId, validUsername.id));

    const hasTerms = acceptances.some(
        (a) =>
            a.documentType === "terms_of_use" &&
            a.documentVersion === LEGAL_TERMS_VERSION,
    );
    const hasPrivacy = acceptances.some(
        (a) =>
            a.documentType === "privacy_policy" &&
            a.documentVersion === LEGAL_PRIVACY_VERSION,
    );

    return {
        message: "login successfully",
        user: {
            id: validUsername.id,
            name: validUsername.name,
            surname: validUsername.surname,
            username: validUsername.username,
            role: role.name,
            passwordChangeRequired: validUsername.passwordChangeRequired,
            legalAcceptanceRequired: !(hasTerms && hasPrivacy),
        },
    };
}

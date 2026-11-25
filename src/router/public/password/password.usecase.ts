import { UsersRepository } from "@/database/tables/users/users.repository";
import {
    EmailVerificationCodesRepository,
    generateSixDigitCode,
} from "@/database/tables/emailVerificationCodes/emailVerificationCodes.repository";
import { sendVerificationCodeEmail } from "@/lib/nodemailer/nodemailer";
import { hashPassword } from "@/lib/hash";
import type {
    ForgotPasswordInput,
    ResetPasswordInput,
} from "./password.schemas";

export async function usecaseForgotPassword(data: ForgotPasswordInput) {
    const usersRepo = new UsersRepository();
    const user = await usersRepo.findActiveByEmail(data.email);

    if (user) {
        const code = generateSixDigitCode();
        const codesRepo = new EmailVerificationCodesRepository();
        await codesRepo.createCode(data.email, "password_reset", code, 15);

        await sendVerificationCodeEmail({
            to: data.email,
            code,
            purpose: "password_reset",
            recipientName: user.name,
        });
    }

    // Resposta uniforme para evitar enumeração de contas
    return {
        message:
            "Se o e-mail estiver cadastrado, você receberá um código de verificação em instantes.",
        expiresInMinutes: 15,
    };
}

export async function usecaseResetPassword(data: ResetPasswordInput) {
    const codesRepo = new EmailVerificationCodesRepository();
    const usersRepo = new UsersRepository();

    const verification = await codesRepo.verifyAndConsumeCode(
        data.email,
        "password_reset",
        data.code,
    );

    if (!verification.ok) {
        throw new Error("INVALID_OR_EXPIRED_CODE");
    }

    const user = await usersRepo.findActiveByEmail(data.email);
    if (!user) {
        throw new Error("INVALID_OR_EXPIRED_CODE");
    }

    const hashed = await hashPassword(data.newPassword);
    await usersRepo.updatePassword(user.id, hashed);

    return {
        userId: user.id,
        message: "Password reset successfully",
    };
}

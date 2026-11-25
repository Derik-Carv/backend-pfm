import type { FastifyReply, FastifyRequest } from "fastify";
import {
    forgotPasswordSchema,
    resetPasswordSchema,
    type ForgotPasswordInput,
    type ResetPasswordInput,
} from "./password.schemas";
import {
    usecaseForgotPassword,
    usecaseResetPassword,
} from "./password.usecase";

export async function forgotPasswordController(
    request: FastifyRequest<{ Body: ForgotPasswordInput }>,
    reply: FastifyReply,
) {
    try {
        const data = forgotPasswordSchema.parse(request.body);
        const result = await usecaseForgotPassword(data);
        return reply.status(200).send(result);
    } catch (error: any) {
        request.log.error(error);

        if (error.name === "ZodError") {
            return reply.status(400).send({
                message: "Validation error",
                issues: error.errors,
            });
        }

        if (
            error.message === "SMTP_NOT_CONFIGURED" ||
            error.message === "EMAIL_SEND_FAILED"
        ) {
            return reply.status(500).send({
                message: "Could not send recovery email right now",
            });
        }

        return reply.status(500).send({
            message: "Internal server error while requesting password reset",
        });
    }
}

export async function resetPasswordController(
    request: FastifyRequest<{ Body: ResetPasswordInput }>,
    reply: FastifyReply,
) {
    try {
        const data = resetPasswordSchema.parse(request.body);
        const result = await usecaseResetPassword(data);

        request.log.info(
            {
                audit: true,
                auditAction: "password_reset",
                actorId: result.userId,
                route: request.routeOptions.url,
                statusCode: 200,
                success: true,
                requestId: request.id,
            },
            "Audit action",
        );

        return reply.status(200).send({ message: result.message });
    } catch (error: any) {
        request.log.error(error);

        if (error.name === "ZodError") {
            return reply.status(400).send({
                message: "Validation error",
                issues: error.errors,
            });
        }

        if (error.message === "INVALID_OR_EXPIRED_CODE") {
            return reply.status(400).send({
                message: "Invalid or expired verification code",
            });
        }

        return reply.status(500).send({
            message: "Internal server error while resetting password",
        });
    }
}

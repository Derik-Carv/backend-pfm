import type { FastifyReply, FastifyRequest } from "fastify";
import {
    loginSchema,
    type LoginUserInput,
} from "@/router/public/login/login.schemas";
import { usecaseLogin } from "@/router/public/login/login.usecase";
import { jwtTokenGenerate } from "@/lib/jwt/jwt";
import { extractRequestMeta, recordAuditLog } from "@/lib/lgpd/audit";

export const loginController = async (
    request: FastifyRequest<{ Body: LoginUserInput }>,
    reply: FastifyReply,
) => {
    const meta = extractRequestMeta(request);
    try {
        const data = loginSchema.parse(request.body);

        const userloged = await usecaseLogin(data);

        const token = jwtTokenGenerate(request.server, {
            id: userloged.user.id,
            role: userloged.user.role,
            tokenVersion: userloged.user.tokenVersion,
        });

        await recordAuditLog({
            actorId: userloged.user.id,
            actorRole: userloged.user.role,
            action: "auth.login.success",
            targetTable: "users",
            targetId: userloged.user.id,
            ipAddress: meta.ipAddress,
            userAgent: meta.userAgent,
            statusCode: 200,
        });

        return reply.status(200).send({
            message: "login sucess",
            token,
            passwordChangeRequired: userloged.user.passwordChangeRequired,
            legalAcceptanceRequired: userloged.user.legalAcceptanceRequired,
        });
    } catch (error: unknown) {
        if (error instanceof Error && error.name === "ZodError") {
            return reply.status(400).send({
                message: "Validation error",
                issues: "issues" in error ? error.issues : undefined,
            });
        }

        if (
            error instanceof Error &&
            error.message === "USERNAME_OR_PASSOWORD_INVALID"
        ) {
            await recordAuditLog({
                action: "auth.login.failed",
                targetTable: "users",
                ipAddress: meta.ipAddress,
                userAgent: meta.userAgent,
                statusCode: 401,
            });
            return reply
                .status(401)
                .send({ message: "username or password invalid" });
        }

        return reply.status(500).send({
            message: "Internal server error while logging in",
        });
    }
};

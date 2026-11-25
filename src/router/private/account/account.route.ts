import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { authMiddleware } from "@/middlewares/auth.middleware";
import { UsersRepository } from "@/database/tables/users/users.repository";
import {
    changePasswordResponseSchema,
    changePasswordSchema,
} from "./account.schemas";
import { hashPassword, verifyPassword } from "@/lib/hash";
import { jwtTokenGenerate } from "@/lib/jwt/jwt";
import { rateLimitProfiles } from "@/policies/rateLimit";
import { errorResponseSchema } from "@/router/error.schema";
import { registerAccountPrivacyRoutes } from "./account.privacy";

export async function accountRoutes(app: FastifyInstance) {
    app.addHook("preHandler", authMiddleware);

    await registerAccountPrivacyRoutes(app);

    app.patch("/password", {
        config: {
            rateLimit: rateLimitProfiles.sensitive,
        },
        schema: {
            tags: ["Account", "Password"],
            summary: "Change the authenticated user's password",
            body: changePasswordSchema,
            response: {
                200: changePasswordResponseSchema,
                400: errorResponseSchema,
                401: errorResponseSchema,
                500: errorResponseSchema,
            },
        },
    }, async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const { currentPassword, newPassword } = changePasswordSchema.parse(
                request.body,
            );
            const users = new UsersRepository();
            const user = await users.findId(request.user.id);

            if (!user || !(await verifyPassword(currentPassword, user.password))) {
                return reply.status(401).send({ message: "Current password is invalid" });
            }

            const updatedUser = await users.updatePassword(
                request.user.id,
                await hashPassword(newPassword),
            );
            const token = jwtTokenGenerate(request.server, {
                id: request.user.id,
                role: request.user.role,
                tokenVersion: updatedUser?.tokenVersion ?? user.tokenVersion + 1,
            });
            request.log.info(
                {
                    audit: true,
                    auditAction: "password_change",
                    actorId: request.user.id,
                    actorRole: request.user.role,
                    route: request.routeOptions.url,
                    statusCode: 200,
                    success: true,
                    requestId: request.id,
                },
                "Audit action",
            );

            return reply.status(200).send({
                message: "Password changed successfully",
                passwordChangeRequired: false,
                token,
            });
        } catch (error: any) {
            if (error?.name === "ZodError") {
                return reply.status(400).send({
                    message: "Validation error",
                    issues: error.errors,
                });
            }
            request.log.error({ err: error }, "Error while changing password");
            return reply.status(500).send({
                message: "Internal server error while changing password",
            });
        }
    });
}

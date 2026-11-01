import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { authMiddleware } from "@/middlewares/auth.middleware";
import { UsersRepository } from "@/database/tables/users/users.repository";
import {
    changePasswordResponseSchema,
    changePasswordSchema,
} from "./account.schemas";
import { hashPassword, verifyPassword } from "@/lib/hash";

export async function accountRoutes(app: FastifyInstance) {
    app.addHook("preHandler", authMiddleware);

    app.patch("/password", {
        schema: {
            tags: ["Account", "Password"],
            summary: "Change the authenticated user's password",
            body: changePasswordSchema,
            response: {
                200: changePasswordResponseSchema,
                400: { type: "object" },
                401: { type: "object" },
                500: { type: "object" },
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

            await users.updatePassword(request.user.id, await hashPassword(newPassword));
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

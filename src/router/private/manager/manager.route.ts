import { type FastifyInstance } from "fastify";
import { authMiddleware } from "@/middlewares/auth.middleware";
import { inspectRole } from "@/middlewares/role.middleware";
import { allRoles } from "@/lib/roles.list";

const allowedRoles = [allRoles.administrator || allRoles.manager];

export async function managerRoutes(app: FastifyInstance) {
    app.addHook("preHandler", authMiddleware);

    app.addHook("preHandler", inspectRole(allowedRoles));
}

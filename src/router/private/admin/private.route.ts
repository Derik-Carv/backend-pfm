import { type FastifyInstance } from "fastify";
import { authMiddleware } from "@/middlewares/auth.middleware";
import { inspectRole } from "@/middlewares/role.middleware";
import { allRoles } from "@/lib/roles.list";
import { adminDataRoutes } from "./data/adminData.route";

export async function adminRoutes(app: FastifyInstance) {
    app.addHook("preHandler", authMiddleware);

    app.addHook("preHandler", inspectRole([allRoles.administrator]));

    app.register(adminDataRoutes, { prefix: "/data" });
}

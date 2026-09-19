import type { FastifyInstance } from "fastify";
import { publicRoutes } from "@/router/public/public.routes";
import { adminRoutes } from "@/router/private/admin/private.route";

export async function appRoutes(app: FastifyInstance) {
    app.register(publicRoutes, { prefix: "/public" });
    app.register(adminRoutes, { prefix: "/admin" });
}

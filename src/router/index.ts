import type { FastifyInstance } from "fastify";
import { publicRoutes } from "@/router/public/auth.routes";

export async function appRoutes(app: FastifyInstance) {
    app.register(publicRoutes, { prefix: "/public" });
}

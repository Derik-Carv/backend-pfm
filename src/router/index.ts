import type { FastifyInstance } from "fastify";
import { publicRoutes } from "@/router/public/public.routes";

export async function appRoutes(app: FastifyInstance) {
    app.register(publicRoutes, { prefix: "/public" });
}

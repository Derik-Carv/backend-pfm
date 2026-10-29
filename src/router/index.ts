import type { FastifyInstance } from "fastify";
import { publicRoutes } from "@/router/public/public.routes";
import { adminRoutes } from "@/router/private/admin/private.route";
import { managerRoutes } from "./private/manager/manager.route";
import { homeRoutes } from "./private/home/home.route";
import { managerServicesRoutes } from "./private/service/myServicesList.route";
import { menuClientRoutes } from "./private/client/myClient.route";
import { nfServicesRoutes } from "./private/NF/nf.route";

export async function appRoutes(app: FastifyInstance) {
    app.register(publicRoutes, { prefix: "/public" });
    app.register(adminRoutes, { prefix: "/admin" });
    app.register(managerRoutes, { prefix: "/manager" });
    app.register(homeRoutes, { prefix: "/home" });
    app.register(managerServicesRoutes, { prefix: "/services" });
    app.register(menuClientRoutes, { prefix: "/clients" });
    app.register(nfServicesRoutes, { prefix: "/nf" });
}

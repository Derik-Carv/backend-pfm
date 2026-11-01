import type { FastifyInstance } from "fastify";
import { publicRoutes } from "@/router/public/public.routes";
import { adminRoutes } from "@/router/private/admin/private.route";
import { managerRoutes } from "./private/manager/manager.route";
import { homeRoutes } from "./private/home/home.route";
import { managerServicesRoutes } from "./private/service/myServicesList.route";
import { menuClientRoutes } from "./private/client/myClient.route";
import { nfQueryRoutes, nfServicesRoutes } from "./private/NF/nf.route";
import { typeRoutes } from "./private/type/type.route";
import { movimentationRoutes } from "./private/movimentation/movimentation.route";
import { accountRoutes } from "./private/account/account.route";

export async function appRoutes(app: FastifyInstance) {
    app.register(publicRoutes, { prefix: "/public" });
    app.register(adminRoutes, { prefix: "/admin" });
    app.register(managerRoutes, { prefix: "/manager" });
    app.register(homeRoutes, { prefix: "/home" });
    app.register(managerServicesRoutes, { prefix: "/services" });
    app.register(menuClientRoutes, { prefix: "/clients" });
    app.register(nfServicesRoutes, { prefix: "/nf" });
    app.register(nfQueryRoutes, { prefix: "/notes" });
    app.register(typeRoutes, { prefix: "/types" });
    app.register(movimentationRoutes, { prefix: "/movimentations" });
    app.register(accountRoutes, { prefix: "/account" });
}

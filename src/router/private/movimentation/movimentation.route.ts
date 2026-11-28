import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { authMiddleware } from "@/middlewares/auth.middleware";
import { inspectRole } from "@/middlewares/role.middleware";
import { allRoles } from "@/lib/roles.list";
import {
    createMovimentationRouteOptions,
    deactivateMovimentationRouteOptions,
    listMovimentationRouteOptions,
} from "./movimentation.options";
import {
    createMovimentationController,
    deactivateMovimentationController,
    listMovimentationsController,
} from "./movimentation.controller";

const allowedRoles = [
    allRoles.administrator,
    allRoles.company_admin,
    allRoles.manager,
    allRoles.finance,
];

async function blockPersonalAccountMovimentation(
    request: FastifyRequest,
    reply: FastifyReply,
) {
    if (
        request.user?.role !== allRoles.administrator &&
        request.tenant?.accountType === "personal"
    ) {
        return reply.status(403).send({
            message: "Movimentações de notas fiscais não estão disponíveis para contas pessoais (CPF).",
        });
    }
}

export async function movimentationRoutes(app: FastifyInstance) {
    app.addHook("preHandler", authMiddleware);
    app.addHook("preHandler", inspectRole(allowedRoles));
    app.addHook("preHandler", blockPersonalAccountMovimentation);
    app.get("/", listMovimentationRouteOptions, listMovimentationsController);
    app.post("/", createMovimentationRouteOptions, createMovimentationController);
    app.patch(
        "/:id/deactivate",
        deactivateMovimentationRouteOptions,
        deactivateMovimentationController,
    );
}

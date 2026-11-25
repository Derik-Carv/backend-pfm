import { type FastifyInstance, type FastifyReply, type FastifyRequest } from "fastify";
import { z } from "zod";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/database/index";
import { clients } from "@/database/schema/schema";
import { authMiddleware } from "@/middlewares/auth.middleware";
import { inspectRole } from "@/middlewares/role.middleware";
import { allRoles } from "@/lib/roles.list";
import {
    createClientRouteOptions,
    editClientRouteOptions,
    getClientRouteOptions,
} from "./client.options";
import { getClientsController } from "./get/getClient.controller";
import { createClientController } from "./create/createClient.controller";
import { editClientController } from "./patch/editClient.controller";
import { errorResponseSchema } from "@/router/error.schema";

const allowedReadRoles = [
    allRoles.administrator,
    allRoles.company_admin,
    allRoles.manager,
    allRoles.finance,
    allRoles.observer,
    allRoles.colaborator,
];

const allowedWriteRoles = [
    allRoles.administrator,
    allRoles.company_admin,
    allRoles.manager,
    allRoles.finance,
];

const clientIdParamsSchema = z.object({
    id: z.string().uuid(),
});

const anonymizeClientResponseSchema = z.object({
    message: z.string(),
    id: z.string().uuid(),
    anonymizedAt: z.date(),
    fiscalRetentionNotice: z.string(),
});

export async function menuClientRoutes(app: FastifyInstance) {
    app.addHook("preHandler", authMiddleware);

    app.register(async (readRoutes) => {
        readRoutes.addHook("preHandler", inspectRole(allowedReadRoles));
        readRoutes.get("/", getClientRouteOptions, getClientsController);
    });

    app.register(async (writeRoutes) => {
        writeRoutes.addHook("preHandler", inspectRole(allowedWriteRoles));
        writeRoutes.post("/", createClientRouteOptions, createClientController);
        writeRoutes.patch("/", editClientRouteOptions, editClientController);
    });

    app.post(
        "/:id/anonymize",
        {
            preHandler: [inspectRole([allRoles.company_admin])],
            schema: {
                tags: ["Client", "LGPD"],
                summary:
                    "Anonymize a personal client record (PF) within the active company scope (LGPD Art. 18 VI & Art. 16 I)",
                params: clientIdParamsSchema,
                response: {
                    200: anonymizeClientResponseSchema,
                    404: errorResponseSchema,
                    500: errorResponseSchema,
                },
            },
        },
        async (request: FastifyRequest, reply: FastifyReply) => {
            const { id } = clientIdParamsSchema.parse(request.params);
            const accessibleIds = request.tenant?.accessibleCompanyIds ?? [];
            if (accessibleIds.length === 0) {
                return reply.status(404).send({ message: "Client not found" });
            }

            const [target] = await db
                .select()
                .from(clients)
                .where(
                    and(
                        eq(clients.id, id),
                        inArray(clients.companyId, accessibleIds),
                    ),
                )
                .limit(1);

            if (!target) {
                return reply.status(404).send({ message: "Client not found" });
            }

            const shortId = target.id.replace(/-/g, "").slice(0, 12);
            const anonymizedAt = new Date();

            await db
                .update(clients)
                .set({
                    registeredCompanyName: `Cliente Anonimizado LGPD (${shortId})`,
                    tradeName: `Cliente Anonimizado (${shortId})`,
                    cpf: target.cpf ? `ANON-${shortId}` : null,
                    email: null,
                    active: false,
                    anonymizedAt,
                })
                .where(eq(clients.id, target.id));

            return reply.status(200).send({
                message: "Cliente anonimizado e desativado com sucesso.",
                id: target.id,
                anonymizedAt,
                fiscalRetentionNotice:
                    "Notas fiscais e serviços vinculados permanecem preservados por 5 anos para cumprimento de obrigação fiscal (LGPD, Art. 16, I).",
            });
        },
    );
}

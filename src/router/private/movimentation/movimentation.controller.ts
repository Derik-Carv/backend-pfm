import type { FastifyReply, FastifyRequest } from "fastify";
import { MovimentationRepository } from "@/database/tables/movimentation/movimentation.repository";
import { NfRepository } from "@/database/tables/nf/nf.repository";
import { ClientRepository } from "@/database/tables/clients/clients.repository";
import { UsersRepository } from "@/database/tables/users/users.repository";
import { UserCompaniesRepository } from "@/database/tables/userCompanies/userCompanies.repository";
import { hasTenantAccess } from "@/lib/tenant";
import {
    createMovimentationSchema,
    movimentationIdParamsSchema,
} from "./movimentation.schemas";

const repository = new MovimentationRepository();
const nfRepository = new NfRepository();
const clientRepository = new ClientRepository();
const usersRepository = new UsersRepository();
const userCompaniesRepository = new UserCompaniesRepository();

export async function listMovimentationsController(
    request: FastifyRequest,
    reply: FastifyReply,
) {
    const companyIds = request.tenant?.accessibleCompanyIds;
    const movimentations = await repository.findActives(companyIds);
    return reply.status(200).send({
        message: "Movimentations retrieved successfully",
        movimentations,
    });
}

export async function createMovimentationController(
    request: FastifyRequest,
    reply: FastifyReply,
) {
    try {
        const data = createMovimentationSchema.parse(request.body);
        const activeCompanyId = request.tenant?.activeCompanyId;
        const accessibleCompanyIds = request.tenant?.accessibleCompanyIds;
        if (!activeCompanyId || !accessibleCompanyIds || accessibleCompanyIds.length === 0) {
            return reply.status(403).send({ message: "Forbidden: Active company context required" });
        }

        if (data.nfId) {
            const note = await nfRepository.findId(data.nfId);
            if (!note || !hasTenantAccess(note.companyId, accessibleCompanyIds)) {
                return reply.status(404).send({ message: "Fiscal note not found" });
            }
        }

        if (data.destinationClientId) {
            const client = await clientRepository.findById(data.destinationClientId);
            if (!client || !hasTenantAccess(client.companyId, accessibleCompanyIds)) {
                return reply.status(404).send({ message: "Destination client not found" });
            }
        }

        if (data.destinationUserId) {
            const targetUser = await usersRepository.findId(data.destinationUserId);
            if (!targetUser || !targetUser.active) {
                return reply.status(404).send({ message: "Destination user not found" });
            }
            const targetCompanies = await userCompaniesRepository.findCompaniesByUserId(targetUser.id);
            const targetCompanyIds = new Set([
                ...(targetUser.primaryCompanyId ? [targetUser.primaryCompanyId] : []),
                ...targetCompanies.map((c) => c.id),
            ]);
            const sharesTenant = accessibleCompanyIds.some((id) => targetCompanyIds.has(id));
            if (!sharesTenant) {
                return reply.status(404).send({ message: "Destination user not found" });
            }
        }

        const existing = await repository.findName(data.name, [activeCompanyId]);
        if (existing) {
            return reply.status(409).send({ message: "Movimentation already exists" });
        }
        const movimentation = await repository.create({
            name: data.name,
            nfId: data.nfId ?? null,
            destinationUserId: data.destinationUserId ?? null,
            destinationClientId: data.destinationClientId ?? null,
            justify: data.justify,
            companyId: activeCompanyId,
            active: true,
        });
        return reply.status(201).send({
            message: "Movimentation created successfully",
            movimentation,
        });
    } catch (error: any) {
        if (error?.name === "ZodError") {
            return reply.status(400).send({
                message: "Validation error",
                issues: error.errors,
            });
        }
        request.log.error({ err: error }, "Error while creating movimentation");
        return reply.status(500).send({
            message: "Internal server error while creating movimentation",
        });
    }
}

export async function deactivateMovimentationController(
    request: FastifyRequest,
    reply: FastifyReply,
) {
    try {
        const { id } = movimentationIdParamsSchema.parse(request.params);
        const accessibleCompanyIds = request.tenant?.accessibleCompanyIds;
        const existing = await repository.findId(id);

        if (!existing || !hasTenantAccess(existing.companyId, accessibleCompanyIds)) {
            return reply.status(404).send({ message: "Movimentation not found" });
        }

        const movimentation = await repository.deactivate(id);
        if (!movimentation) {
            return reply.status(404).send({ message: "Movimentation not found" });
        }
        return reply.status(200).send({
            message: "Movimentation deactivated successfully",
            movimentation,
        });
    } catch (error: any) {
        if (error?.name === "ZodError") {
            return reply.status(400).send({
                message: "Validation error",
                issues: error.errors,
            });
        }
        request.log.error({ err: error }, "Error while deactivating movimentation");
        return reply.status(500).send({
            message: "Internal server error while deactivating movimentation",
        });
    }
}

import type { FastifyReply, FastifyRequest } from "fastify";
import { MovimentationRepository } from "@/database/tables/movimentation/movimentation.repository";
import {
    createMovimentationSchema,
    movimentationIdParamsSchema,
} from "./movimentation.schemas";

const repository = new MovimentationRepository();

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
        const existing = await repository.findName(
            data.name,
            activeCompanyId ? [activeCompanyId] : undefined,
        );
        if (existing) {
            return reply.status(409).send({ message: "Movimentation already exists" });
        }
        const movimentation = await repository.create({
            ...data,
            ...(activeCompanyId ? { companyId: activeCompanyId } : {}),
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

        if (
            !existing ||
            (accessibleCompanyIds &&
                existing.companyId &&
                !accessibleCompanyIds.includes(existing.companyId))
        ) {
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

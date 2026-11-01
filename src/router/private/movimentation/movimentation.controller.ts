import type { FastifyReply, FastifyRequest } from "fastify";
import { MovimentationRepository } from "@/database/tables/movimentation/movimentation.repository";
import {
    createMovimentationSchema,
    movimentationIdParamsSchema,
} from "./movimentation.schemas";

const repository = new MovimentationRepository();

export async function listMovimentationsController(
    _request: FastifyRequest,
    reply: FastifyReply,
) {
    const movimentations = await repository.findActives();
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
        const existing = await repository.findName(data.name);
        if (existing) {
            return reply.status(409).send({ message: "Movimentation already exists" });
        }
        const movimentation = await repository.create({
            ...data,
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

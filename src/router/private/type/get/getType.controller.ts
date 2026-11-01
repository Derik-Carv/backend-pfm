import type { FastifyReply, FastifyRequest } from "fastify";
import { TypeRepository } from "@/database/tables/type/type.repository,";
import {
    createTypeSchema,
    typeIdParamsSchema,
} from "../type.schemas";

export async function getTypesController(
    _request: FastifyRequest,
    reply: FastifyReply,
) {
    const types = await new TypeRepository().findAll();

    return reply.status(200).send({
        message: "Fiscal note types retrieved successfully",
        types,
    });
}

export async function createTypeController(
    request: FastifyRequest,
    reply: FastifyReply,
) {
    try {
        const { name } = createTypeSchema.parse(request.body);
        const repository = new TypeRepository();
        if (await repository.findName(name)) {
            return reply.status(409).send({ message: "Type already exists" });
        }
        const type = await repository.create({ name, active: true });
        return reply.status(201).send({ message: "Type created successfully", type });
    } catch (error: any) {
        if (error?.name === "ZodError") {
            return reply.status(400).send({ message: "Validation error", issues: error.errors });
        }
        request.log.error({ err: error }, "Error while creating type");
        return reply.status(500).send({ message: "Internal server error while creating type" });
    }
}

export async function deactivateTypeController(
    request: FastifyRequest,
    reply: FastifyReply,
) {
    try {
        const { id } = typeIdParamsSchema.parse(request.params);
        const type = await new TypeRepository().deactivate(id);
        if (!type) return reply.status(404).send({ message: "Type not found" });
        return reply
            .status(200)
            .send({ message: "Type deactivated successfully", type });
    } catch (error: any) {
        if (error?.name === "ZodError") {
            return reply
                .status(400)
                .send({ message: "Validation error", issues: error.errors });
        }
        request.log.error({ err: error }, "Error while deactivating type");
        return reply
            .status(500)
            .send({ message: "Internal server error while deactivating type" });
    }
}

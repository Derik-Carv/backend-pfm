import type { FastifyReply, FastifyRequest } from "fastify";
import {
    adminListQuerySchema,
    adminRecordBodySchema,
    adminRecordParamsSchema,
    adminTableParamsSchema,
} from "./adminData.schemas";
import {
    createAdminRecord,
    findAdminRecord,
    listAdminRecords,
    updateAdminRecord,
} from "./adminData.repository";

function validationError(reply: FastifyReply, error: unknown) {
    if (error instanceof Error && error.name === "ZodError") {
        return reply.status(400).send({
            message: "Validation error",
            issues: JSON.parse(error.message),
        });
    }
    return null;
}

export async function listAdminRecordsController(
    request: FastifyRequest,
    reply: FastifyReply,
) {
    try {
        const { table } = adminTableParamsSchema.parse(request.params);
        const query = adminListQuerySchema.parse(request.query);
        const result = await listAdminRecords(table, query.page, query.limit, query.status);

        return reply.status(200).send({
            message: "Administrative records retrieved successfully",
            table,
            records: result.records,
            pagination: {
                page: query.page,
                limit: query.limit,
                total: result.total,
                totalPages: Math.ceil(result.total / query.limit),
                hasMore: query.page * query.limit < result.total,
            },
        });
    } catch (error) {
        if (validationError(reply, error)) return;
        request.log.error({ err: error }, "Error while listing administrative records");
        return reply.status(500).send({ message: "Internal server error" });
    }
}

export async function findAdminRecordController(
    request: FastifyRequest,
    reply: FastifyReply,
) {
    try {
        const { table, id } = adminRecordParamsSchema.parse(request.params);
        const record = await findAdminRecord(table, id);
        if (!record) return reply.status(404).send({ message: "Record not found" });
        return reply.status(200).send({
            message: "Administrative record retrieved successfully",
            table,
            record,
        });
    } catch (error) {
        if (validationError(reply, error)) return;
        request.log.error({ err: error }, "Error while retrieving administrative record");
        return reply.status(500).send({ message: "Internal server error" });
    }
}

export async function createAdminRecordController(
    request: FastifyRequest,
    reply: FastifyReply,
) {
    try {
        const { table } = adminTableParamsSchema.parse(request.params);
        const payload = adminRecordBodySchema.parse(request.body);
        const record = await createAdminRecord(table, payload);
        return reply.status(201).send({
            message: "Administrative record created successfully",
            table,
            record,
        });
    } catch (error) {
        if (validationError(reply, error)) return;
        request.log.error({ err: error }, "Error while creating administrative record");
        return reply.status(409).send({
            message: "Record could not be created",
        });
    }
}

export async function updateAdminRecordController(
    request: FastifyRequest,
    reply: FastifyReply,
) {
    try {
        const { table, id } = adminRecordParamsSchema.parse(request.params);
        const payload = adminRecordBodySchema.parse(request.body);
        const record = await updateAdminRecord(table, id, payload);
        if (!record) return reply.status(404).send({ message: "Record not found" });
        return reply.status(200).send({
            message: "Administrative record updated successfully",
            table,
            record,
        });
    } catch (error) {
        if (validationError(reply, error)) return;
        request.log.error({ err: error }, "Error while updating administrative record");
        return reply.status(409).send({
            message: "Record could not be updated",
        });
    }
}

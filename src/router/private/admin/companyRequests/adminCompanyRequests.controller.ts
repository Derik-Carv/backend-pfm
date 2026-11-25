import type { FastifyReply, FastifyRequest } from "fastify";
import {
    companyRequestIdParamsSchema,
    listCompanyRequestsQuerySchema,
    rejectCompanyRequestBodySchema,
    type ListCompanyRequestsQuery,
    type RejectCompanyRequestInput,
} from "./adminCompanyRequests.schemas";
import {
    usecaseApproveCompanyRequest,
    usecaseListCompanyRequests,
    usecaseRejectCompanyRequest,
} from "./adminCompanyRequests.usecase";

export async function listCompanyRequestsController(
    request: FastifyRequest<{ Querystring: ListCompanyRequestsQuery }>,
    reply: FastifyReply,
) {
    try {
        const { status } = listCompanyRequestsQuerySchema.parse(request.query);
        const requests = await usecaseListCompanyRequests(status);
        return reply.status(200).send({
            message: "Company registration requests retrieved successfully",
            requests,
        });
    } catch (error) {
        request.log.error({ err: error }, "Error listing company requests");
        return reply.status(500).send({ message: "Internal server error" });
    }
}

export async function approveCompanyRequestController(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
) {
    try {
        const { id } = companyRequestIdParamsSchema.parse(request.params);
        const result = await usecaseApproveCompanyRequest(id, request.user.id);

        return reply.status(200).send({
            message: "Empresa aprovada com sucesso",
            ...result,
        });
    } catch (error: any) {
        request.log.error({ err: error }, "Error approving company request");

        if (error.message === "REQUEST_NOT_FOUND") {
            return reply.status(404).send({ message: "Registration request not found" });
        }
        if (error.message === "REQUEST_ALREADY_REVIEWED") {
            return reply.status(409).send({ message: "Registration request has already been reviewed" });
        }
        if (error.message === "COMPANY_CNPJ_ALREADY_EXISTS") {
            return reply.status(409).send({ message: "CNPJ is already registered" });
        }
        if (error.message === "EMAIL_ALREADY_EXISTS") {
            return reply.status(409).send({ message: "Admin email is already registered" });
        }
        if (error.message === "CPF_ALREADY_EXISTS") {
            return reply.status(409).send({ message: "Admin CPF is already registered" });
        }

        return reply.status(500).send({ message: "Internal server error" });
    }
}

export async function rejectCompanyRequestController(
    request: FastifyRequest<{
        Params: { id: string };
        Body: RejectCompanyRequestInput;
    }>,
    reply: FastifyReply,
) {
    try {
        const { id } = companyRequestIdParamsSchema.parse(request.params);
        const { reason } = rejectCompanyRequestBodySchema.parse(request.body);
        const updated = await usecaseRejectCompanyRequest(id, reason, request.user.id);

        return reply.status(200).send({
            message: "Solicitação recusada",
            request: updated,
        });
    } catch (error: any) {
        request.log.error({ err: error }, "Error rejecting company request");

        if (error.name === "ZodError") {
            return reply.status(400).send({ message: "Validation error" });
        }
        if (error.message === "REQUEST_NOT_FOUND") {
            return reply.status(404).send({ message: "Registration request not found" });
        }
        if (error.message === "REQUEST_ALREADY_REVIEWED") {
            return reply.status(409).send({ message: "Registration request has already been reviewed" });
        }

        return reply.status(500).send({ message: "Internal server error" });
    }
}

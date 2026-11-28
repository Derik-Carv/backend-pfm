import type { FastifyReply, FastifyRequest } from "fastify";
import {
    createCompanyRequestBodySchema,
    requestCompanyCodeBodySchema,
    type CreateCompanyRequestInput,
    type RequestCompanyCodeInput,
} from "./companyRequests.schemas";
import {
    usecaseCreateCompanyRequest,
    usecaseRequestCompanyCode,
} from "./companyRequests.usecase";
import { extractRequestMeta } from "@/lib/lgpd/audit";

export async function requestCompanyCodeController(
    request: FastifyRequest<{ Body: RequestCompanyCodeInput }>,
    reply: FastifyReply,
) {
    try {
        const data = requestCompanyCodeBodySchema.parse(request.body);
        const result = await usecaseRequestCompanyCode(data);
        return reply.status(200).send(result);
    } catch (error: any) {
        request.log.error(error);

        if (error.name === "ZodError") {
            return reply.status(400).send({
                message: "Validation error",
                issues: error.errors,
            });
        }

        if (error.message === "INVALID_CPF") {
            return reply.status(400).send({ message: "Invalid CPF" });
        }

        if (error.message === "INVALID_CNPJ") {
            return reply.status(400).send({ message: "Invalid CNPJ" });
        }

        if (error.message === "EMAIL_ALREADY_EXISTS") {
            return reply.status(409).send({ message: "Email is already registered" });
        }

        if (error.message === "COMPANY_CNPJ_ALREADY_EXISTS") {
            return reply.status(409).send({ message: "CNPJ is already registered" });
        }

        if (error.message === "REQUEST_ALREADY_PENDING") {
            return reply.status(409).send({
                message: "There is already a pending registration request for this company or email",
            });
        }

        if (error.message === "OTP_COOLDOWN_ACTIVE") {
            return reply.status(429).send({
                message: "Aguarde alguns instantes antes de solicitar um novo código",
            });
        }

        if (
            error.message === "SMTP_NOT_CONFIGURED" ||
            error.message === "EMAIL_SEND_FAILED"
        ) {
            return reply.status(500).send({
                message: "Could not send verification email right now",
            });
        }

        return reply.status(500).send({
            message: "Internal server error while sending verification code",
        });
    }
}

export async function createCompanyRequestController(
    request: FastifyRequest<{ Body: CreateCompanyRequestInput }>,
    reply: FastifyReply,
) {
    try {
        const data = createCompanyRequestBodySchema.parse(request.body);
        const meta = extractRequestMeta(request);
        const created = await usecaseCreateCompanyRequest(data, meta);

        return reply.status(201).send({
            message: created.autoApproved
                ? "Conta pessoal criada e ativada com sucesso! Já pode entrar com seu e-mail e senha."
                : "Solicitação de cadastro enviada! Aguarde a aprovação do administrador da plataforma.",
            autoApproved: created.autoApproved,
            ...("username" in created && created.username
                ? { username: created.username }
                : {}),
            request: created.request,
        });
    } catch (error: any) {
        request.log.error(error);

        if (error.name === "ZodError") {
            return reply.status(400).send({
                message: "Validation error",
                issues: error.errors,
            });
        }

        if (error.message === "INVALID_CPF") {
            return reply.status(400).send({ message: "Invalid CPF" });
        }

        if (error.message === "INVALID_CNPJ") {
            return reply.status(400).send({ message: "Invalid CNPJ" });
        }

        if (error.message === "INVALID_OR_EXPIRED_CODE") {
            return reply.status(400).send({
                message: "Invalid or expired verification code",
            });
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

        if (error.message === "REQUEST_ALREADY_PENDING") {
            return reply.status(409).send({
                message: "There is already a pending registration request for these details",
            });
        }

        return reply.status(500).send({
            message: "Internal server error while submitting company registration request",
        });
    }
}

import type { FastifyRequest, FastifyReply } from "fastify";
import type {
    CreateMotherCompanyInput,
    CreateBranchCompanyInput,
    UpdateCompanyInput,
    CreateCompanyUserInput,
    UpdateCompanyUserInput,
} from "./companies.schemas";
import {
    usecaseCreateMotherCompany,
    usecaseUpdateMotherCompany,
    usecaseCreateBranchCompany,
    usecaseUpdateBranchCompany,
    usecaseListMothers,
    usecaseListBranches,
    usecaseGetMyCompanies,
    usecaseListCompanyUsers,
    usecaseCreateCompanyUser,
    usecaseUpdateCompanyUser,
} from "./companies.usecase";
import { UsersRepository } from "@/database/tables/users/users.repository";

export async function createMotherCompanyController(
    request: FastifyRequest<{ Body: CreateMotherCompanyInput }>,
    reply: FastifyReply,
) {
    try {
        if (request.user.role !== "administrator") {
            return reply.status(403).send({ message: "Access denied" });
        }

        const { company, adminUser } = await usecaseCreateMotherCompany(
            request.body,
            request.user.id,
        );

        return reply.status(201).send({
            message: "Mother company created successfully",
            company,
            ...(adminUser ? { adminUser } : {}),
        });
    } catch (error: any) {
        if (error.message === "INVALID_CPF") {
            return reply.status(400).send({ message: "Invalid CPF (11 digits required)" });
        }
        if (error.message === "COMPANY_CNPJ_ALREADY_EXISTS") {
            return reply.status(409).send({ message: "CNPJ already registered" });
        }
        if (error.message === "CPF_ALREADY_EXISTS") {
            return reply.status(409).send({ message: "Admin CPF already registered" });
        }
        if (error.message === "EMAIL_ALREADY_EXISTS") {
            return reply.status(409).send({ message: "Admin email already registered" });
        }
        if (error.message === "USERNAME_ALREADY_EXISTS") {
            return reply.status(409).send({ message: "Admin username already registered" });
        }
        return reply.status(500).send({ message: "Internal server error" });
    }
}

export async function updateMotherCompanyController(
    request: FastifyRequest<{
        Params: { id: string };
        Body: UpdateCompanyInput;
    }>,
    reply: FastifyReply,
) {
    try {
        if (request.user.role !== "administrator") {
            return reply.status(403).send({ message: "Access denied" });
        }

        const updated = await usecaseUpdateMotherCompany(
            request.params.id,
            request.body,
        );

        return reply.status(200).send({
            message: "Mother company updated successfully",
            company: updated,
        });
    } catch (error: any) {
        if (error.message === "MOTHER_COMPANY_NOT_FOUND") {
            return reply.status(404).send({ message: "Mother company not found" });
        }
        return reply.status(500).send({ message: "Internal server error" });
    }
}

export async function createBranchCompanyController(
    request: FastifyRequest<{ Body: CreateBranchCompanyInput }>,
    reply: FastifyReply,
) {
    try {
        if (!request.tenant?.motherId) {
            return reply.status(400).send({ message: "No active mother company context" });
        }

        if (request.user.role !== "administrator" && !request.tenant.isMother) {
            return reply.status(403).send({
                message: "Only Mother company admins can create branches",
            });
        }

        const newBranch = await usecaseCreateBranchCompany(
            request.body,
            request.tenant.motherId,
            request.user.id,
        );

        return reply.status(201).send({
            message: "Branch company created successfully",
            company: newBranch,
        });
    } catch (error: any) {
        if (error.message === "COMPANY_CNPJ_ALREADY_EXISTS") {
            return reply.status(409).send({ message: "CNPJ already registered" });
        }
        if (error.message === "MOTHER_COMPANY_NOT_FOUND") {
            return reply.status(404).send({ message: "Mother company not found" });
        }
        return reply.status(500).send({ message: "Internal server error" });
    }
}

export async function updateBranchCompanyController(
    request: FastifyRequest<{
        Params: { id: string };
        Body: UpdateCompanyInput;
    }>,
    reply: FastifyReply,
) {
    try {
        const updated = await usecaseUpdateBranchCompany(
            request.params.id,
            request.body,
            request.user.role,
            request.tenant?.motherId,
        );

        return reply.status(200).send({
            message: "Branch company updated successfully",
            company: updated,
        });
    } catch (error: any) {
        if (error.message === "BRANCH_COMPANY_NOT_FOUND") {
            return reply.status(404).send({ message: "Branch company not found" });
        }
        if (error.message === "COMPANY_ACCESS_DENIED") {
            return reply.status(403).send({ message: "Access denied to this branch" });
        }
        return reply.status(500).send({ message: "Internal server error" });
    }
}

export async function listMothersController(
    request: FastifyRequest,
    reply: FastifyReply,
) {
    try {
        if (request.user.role !== "administrator") {
            return reply.status(403).send({ message: "Access denied" });
        }

        const list = await usecaseListMothers();
        return reply.status(200).send({
            message: "Mothers listed successfully",
            companies: list,
        });
    } catch {
        return reply.status(500).send({ message: "Internal server error" });
    }
}

export async function listBranchesController(
    request: FastifyRequest,
    reply: FastifyReply,
) {
    try {
        const motherId = request.tenant?.motherId;
        if (!motherId) {
            return reply.status(400).send({ message: "No active mother company context" });
        }

        const branches = await usecaseListBranches(motherId, true);
        return reply.status(200).send({
            message: "Branches listed successfully",
            companies: branches,
        });
    } catch {
        return reply.status(500).send({ message: "Internal server error" });
    }
}

export async function getMyCompaniesController(
    request: FastifyRequest,
    reply: FastifyReply,
) {
    try {
        const userId = request.user.id;
        const usersRepo = new UsersRepository();
        const user = await usersRepo.findId(userId);

        const { companies, isMother } = await usecaseGetMyCompanies(
            userId,
            request.user.role,
            user?.primaryCompanyId,
        );

        return reply.status(200).send({
            message: "Companies retrieved successfully",
            activeCompanyId: request.tenant?.activeCompanyId ?? companies[0]?.id,
            isMother: request.tenant ? request.tenant.isMother && isMother : isMother,
            isConsolidated: request.tenant?.isConsolidated ?? false,
            companies,
        });
    } catch {
        return reply.status(500).send({ message: "Internal server error" });
    }
}

export async function listCompanyUsersController(
    request: FastifyRequest,
    reply: FastifyReply,
) {
    try {
        const motherId = request.tenant?.motherId;
        if (!motherId) {
            return reply.status(400).send({ message: "No active mother company context" });
        }

        const usersList = await usecaseListCompanyUsers(motherId);
        return reply.status(200).send({
            message: "Company users listed successfully",
            users: usersList,
        });
    } catch {
        return reply.status(500).send({ message: "Internal server error" });
    }
}

export async function createCompanyUserController(
    request: FastifyRequest<{ Body: CreateCompanyUserInput }>,
    reply: FastifyReply,
) {
    try {
        const motherId = request.tenant?.motherId;
        const activeCompanyId = request.tenant?.activeCompanyId;

        if (!motherId || !activeCompanyId) {
            return reply.status(400).send({ message: "No active company context" });
        }

        const created = await usecaseCreateCompanyUser(
            request.body,
            motherId,
            activeCompanyId,
        );

        return reply.status(201).send({
            message: "Company user created successfully",
            user: created,
        });
    } catch (error: any) {
        if (error.message === "FORBIDDEN_ROLE" || error.message === "COMPANY_ACCESS_DENIED") {
            return reply.status(403).send({ message: "Access denied" });
        }
        if (error.message === "INVALID_CPF") {
            return reply.status(400).send({ message: "Invalid CPF (11 digits required)" });
        }
        if (error.message === "ROLE_NOT_FOUND" || error.message === "COMPANY_NOT_FOUND") {
            return reply.status(404).send({ message: error.message });
        }
        if (error.message === "CPF_ALREADY_EXISTS") {
            return reply.status(409).send({ message: "CPF already registered" });
        }
        if (error.message === "EMAIL_ALREADY_EXISTS") {
            return reply.status(409).send({ message: "Email already registered" });
        }
        if (error.message === "USERNAME_ALREADY_EXISTS") {
            return reply.status(409).send({ message: "Username already registered" });
        }
        return reply.status(500).send({ message: "Internal server error" });
    }
}

export async function updateCompanyUserController(
    request: FastifyRequest<{
        Params: { id: string };
        Body: UpdateCompanyUserInput;
    }>,
    reply: FastifyReply,
) {
    try {
        const motherId = request.tenant?.motherId;
        if (!motherId) {
            return reply.status(400).send({ message: "No active company context" });
        }

        const updated = await usecaseUpdateCompanyUser(
            request.params.id,
            request.body,
            motherId,
        );

        return reply.status(200).send({
            message: "Company user updated successfully",
            user: updated,
        });
    } catch (error: any) {
        if (error.message === "FORBIDDEN_ROLE" || error.message === "COMPANY_ACCESS_DENIED") {
            return reply.status(403).send({ message: "Access denied" });
        }
        if (error.message === "USER_NOT_FOUND" || error.message === "ROLE_NOT_FOUND") {
            return reply.status(404).send({ message: error.message });
        }
        if (error.message === "EMAIL_ALREADY_EXISTS") {
            return reply.status(409).send({ message: "Email already registered" });
        }
        return reply.status(500).send({ message: "Internal server error" });
    }
}

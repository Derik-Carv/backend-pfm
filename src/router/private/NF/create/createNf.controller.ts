import type { FastifyRequest, FastifyReply } from "fastify";
import { nfCreateBaseSchema, type NfCreateInput } from "../nf.schemas";
import { ClientRepository } from "@/database/tables/clients/clients.repository";
import { UsersRepository } from "@/database/tables/users/users.repository";
import { RoleRepository } from "@/database/tables/roles/roles.repository";
import { injejctCreateNf } from "./createNf.usecase";
import { TypeRepository } from "@/database/tables/type/type.repository,";
import { ServicesRepository } from "@/database/tables/services/services.repository";
import { NfRepository } from "@/database/tables/nf/nf.repository";

const usecaseCreateNf = injejctCreateNf({
    nf: new NfRepository(),
    clientsDb: new ClientRepository(),
    findUser: new UsersRepository(),
    findRole: new RoleRepository(),
    findType: new TypeRepository(),
    findService: new ServicesRepository(),
});

export const createNfServicesController = async (
    request: FastifyRequest<{ Body: NfCreateInput }>,
    reply: FastifyReply,
) => {
    try {
        const userId = request.user.id;
        const data = nfCreateBaseSchema.parse(request.body);

        const newNf = await usecaseCreateNf(userId, data);

        return reply.status(201).send({
            message: "Create nf with sucess",
            nf: newNf,
        });
    } catch (error: any) {
        if (error.name === "ZodError") {
            return reply.status(400).send({
                message: "Validation error",
                issues: error.errors,
            });
        }

        if (error.message === "ROLE_NOT_FOUND") {
            return reply.status(404).send({
                message: "Role not found",
            });
        }

        if (error.message === "USER_NOT_FOUND") {
            return reply.status(404).send({
                message: "User not found",
            });
        }

        if (error.message === "TYPE_INVALID") {
            return reply.status(404).send({
                message: "Invalid type",
            });
        }

        if (error.message === "NF_NUMBER_EXIST") {
            return reply.status(404).send({
                message: "NF already exists",
            });
        }

        if (error.message === "ACESS_KEY_EXIST") {
            return reply.status(404).send({
                message: "Acess key already exists",
            });
        }

        if (error.message === "VALUE_INVALID") {
            return reply.status(404).send({
                message: "Invalid value",
            });
        }

        if (error.message === "CLIENT_NOT_EXIST") {
            return reply.status(404).send({
                message: "Client not found",
            });
        }

        if (error.message === "SERVICE_NOT_EXIST") {
            return reply.status(404).send({
                message: "Service not found",
            });
        }

        if (error.message === "ERROR_CREATE_NF") {
            return reply.status(404).send({
                message: "Create error nf",
            });
        }

        return reply.status(500).send({
            message: "Internal server error while registering role",
        });
    }
};

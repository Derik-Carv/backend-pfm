import type { FastifyRequest, FastifyReply } from "fastify";
import { nfCreateBaseSchema, type NfCreateInput } from "../nf.schemas";
import { ClientRepository } from "@/database/tables/clients/clients.repository";
import { UsersRepository } from "@/database/tables/users/users.repository";
import { RoleRepository } from "@/database/tables/roles/roles.repository";
import { injejctCreateNf } from "./createNf.usecase";
import { TypeRepository } from "@/database/tables/type/type.repository,";
import { ServicesRepository } from "@/database/tables/services/services.repository";
import { NfRepository } from "@/database/tables/nf/nf.repository";
import { NfPdfInconsistencyError } from "./createNf.pdf";

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
        let file: File | undefined;
        let nfFile: string | undefined;

        for await (const part of request.parts()) {
            if (part.type === "file" && part.fieldname === "file") {
                const fileBuffer = await part.toBuffer();
                file = new File([fileBuffer], part.filename, {
                    type: part.mimetype,
                });
            }

            if (part.type === "field" && part.fieldname === "nf") {
                if (typeof part.value === "string") {
                    nfFile = part.value;
                }
            }
        }

        if (!file) throw new Error("FILE_NOT_FOUND");
        if (!nfFile) throw new Error("NF_DATA_NOT_FOUND");

        let nfData: unknown;
        try {
            nfData = JSON.parse(nfFile);
        } catch {
            throw new Error("INVALID_NF_JSON");
        }

        const data = nfCreateBaseSchema.parse(nfData);

        const newNf = await usecaseCreateNf(userId, data, file);

        return reply.status(201).send({
            message: "Create nf with sucess",
            nf: newNf,
        });
    } catch (error: any) {
        request.log.error(
            {
                err: error,
                pdfError:
                    error instanceof Error && error.cause instanceof Error
                        ? {
                              name: error.cause.name,
                              message: error.cause.message,
                              stack: error.cause.stack,
                          }
                        : undefined,
            },
            "Error while creating NF",
        );

        if (error.name === "ZodError") {
            return reply.status(400).send({
                message: "Validation error",
                issues: error.errors,
            });
        }

        const businessErrors400 = [
            "FILE_NOT_FOUND",
            "NF_DATA_NOT_FOUND",
            "INVALID_NF_JSON",
            "INVALID_FILE_TYPE",
            "EMPTY_FILE",
            "PDF_TEXT_NOT_FOUND",
            "PDF_READ_ERROR",
        ];

        if (
            businessErrors400.includes(error.message) ||
            error instanceof NfPdfInconsistencyError
        ) {
            return reply.status(400).send({
                message: error.message,
            });
        }

        const businessErrors404 = [
            "ROLE_NOT_FOUND",
            "USER_NOT_FOUND",
            "TYPE_INVALID",
            "NF_NUMBER_EXIST",
            "ACESS_KEY_EXIST",
            "VALUE_INVALID",
            "CLIENT_NOT_EXIST",
            "SERVICE_NOT_EXIST",
        ];

        if (businessErrors404.includes(error.message)) {
            return reply.status(404).send({
                message: error.message,
            });
        }

        const businessErrors500 = ["ERROR_CREATE_NF", "ERROR_UPDATE_FILE"];

        if (businessErrors500.includes(error.message)) {
            return reply.status(500).send({
                message: error.message,
            });
        }

        return reply.status(500).send({
            message: "Internal server error while registering role",
        });
    }
};

import fs from "node:fs/promises";
import path from "node:path";
import type { CreateNfDependencies } from "@/database/tables/nf/nf.interface";
import { MovimentationRepository } from "@/database/tables/movimentation/movimentation.repository";
import { hasTenantAccess } from "@/lib/tenant";
import type { NfCreateInput } from "../nf.schemas";
import { assertValidPdfBuffer, updateNfPdf, validateNfPdf } from "./createNf.pdf";

export function injejctCreateNf({
    nf,
    clientsDb,
    findUser,
    findRole,
    findType,
    findService,
}: CreateNfDependencies) {
    return async function usecaseCreateNf(
        userId: string,
        data: NfCreateInput,
        file: File,
        activeCompanyId?: string,
        accessibleCompanyIds?: string[],
    ) {
        const user = await findUser.findId(userId);
        if (!user) {
            throw new Error("USER_NOT_FOUND");
        }
        const userRole = await findRole.findById(user.roleId);
        if (!userRole) {
            throw new Error("ROLE_NOT_FOUND");
        }

        const validType = await findType.findId(data.typeId);
        if (!validType) throw new Error("TYPE_INVALID");

        if (data.totalValue <= 0) throw new Error("VALUE_INVALID");

        const validClient = await clientsDb.findById(data.thirdPartyClientId);
        if (
            !validClient ||
            !hasTenantAccess(validClient.companyId, accessibleCompanyIds)
        )
            throw new Error("CLIENT_NOT_EXIST");

        const validService = await findService.findId(data.servicesId);
        if (
            !validService ||
            !hasTenantAccess(validService.companyId, accessibleCompanyIds)
        )
            throw new Error("SERVICE_NOT_EXIST");

        const targetCompanyId = validService.companyId ?? activeCompanyId;
        if (!targetCompanyId || !hasTenantAccess(targetCompanyId, accessibleCompanyIds)) {
            throw new Error("SERVICE_NOT_EXIST");
        }

        if (data.movimentationId) {
            const movRepo = new MovimentationRepository();
            const validMov = await movRepo.findId(data.movimentationId);
            if (!validMov || !hasTenantAccess(validMov.companyId, accessibleCompanyIds)) {
                throw new Error("MOVIMENTATION_NOT_FOUND");
            }
        }

        const validNumber = await nf.findNfNumber(data.numberNf, [targetCompanyId]);
        if (validNumber) throw new Error("NF_NUMBER_EXIST");

        const validAcessKey = await nf.findAcessKey(data.acessKey);
        if (validAcessKey) throw new Error("ACESS_KEY_EXIST");

        if (!(file instanceof File)) {
            throw new Error("FILE_NOT_FOUND");
        }

        if (file.type !== "application/pdf") {
            throw new Error("INVALID_FILE_TYPE");
        }

        if (file.size === 0) {
            throw new Error("EMPTY_FILE");
        }

        try {
            const rawBuffer = Buffer.from(await file.arrayBuffer());
            assertValidPdfBuffer(rawBuffer);
            await validateNfPdf(file, data);
        } catch (error) {
            if (
                error instanceof Error &&
                (error.message === "PDF_TEXT_NOT_FOUND" ||
                    error.message === "NF_PDF_INCONSISTENT" ||
                    error.message === "INVALID_FILE_TYPE" ||
                    error.message === "EMPTY_FILE" ||
                    error.message === "PDF_FILE_TOO_LARGE" ||
                    error.message === "PDF_PAGE_LIMIT_EXCEEDED" ||
                    error.message === "PDF_PARSE_TIMEOUT")
            ) {
                throw error;
            }

            throw new Error("PDF_READ_ERROR", { cause: error });
        }

        let pdf: string;
        try {
            pdf = await updateNfPdf(
                file,
                targetCompanyId,
                validType.name,
                data.acessKey,
            );
        } catch {
            throw new Error("ERROR_UPDATE_FILE");
        }

        if (!pdf) throw new Error("ERROR_UPDATE_FILE");

        let newNf;
        try {
            newNf = await nf.create({
                typeId: data.typeId,
                numberNf: data.numberNf,
                acessKey: data.acessKey,
                thirdPartyClientId: data.thirdPartyClientId,
                emissionDate: data.emissionDate,
                totalValue: data.totalValue.toFixed(2),
                servicesId: data.servicesId,
                movimentationId: data.movimentationId ?? null,
                companyId: targetCompanyId,
                pathFile: pdf,
                active: true,
            });
        } catch {
            await fs.unlink(path.resolve(process.cwd(), pdf)).catch(() => {});
            throw new Error("ERROR_CREATE_NF");
        }

        if (!newNf) throw new Error("ERROR_CREATE_NF");

        return newNf;
    };
}

import type { CreateNfDependencies } from "@/database/tables/nf/nf.interface";
import type { NfCreateInput } from "../nf.schemas";
import { updateNfPdf } from "./createNf.pdf";

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

        const validNumber = await nf.findNfNumber(data.numberNf);
        if (validNumber) throw new Error("NF_NUMBER_EXIST");

        const validAcessKey = await nf.findAcessKey(data.acessKey);
        if (validAcessKey) throw new Error("ACESS_KEY_EXIST");

        if (data.totalValue <= 0) throw new Error("VALUE_INVALID");

        const validClient = await clientsDb.findById(data.thirdPartyClientId);
        if (!validClient) throw new Error("CLIENT_NOT_EXIST");

        const validService = await findService.findId(data.servicesId);
        if (!validService) throw new Error("SERVICE_NOT_EXIST");

        data.active = true;

        if (!(file instanceof File)) {
            throw new Error("FILE_NOT_FOUND");
        }

        if (file.type !== "application/pdf") {
            throw new Error("INVALID_FILE_TYPE");
        }

        if (file.size === 0) {
            throw new Error("EMPTY_FILE");
        }

        let pdf: string;
        try {
            pdf = await updateNfPdf(file, validType.name);
        } catch {
            throw new Error("ERROR_UPDATE_FILE");
        }

        if (!pdf) throw new Error("ERROR_UPDATE_FILE");

        let newNf;
        try {
            newNf = await nf.create({
                ...data,
                pathFile: pdf,
                totalValue: data.totalValue.toFixed(2),
            });
        } catch {
            throw new Error("ERROR_CREATE_NF");
        }

        if (!newNf) throw new Error("ERROR_CREATE_NF");

        return newNf;
    };
}

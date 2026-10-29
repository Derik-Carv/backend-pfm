import type { CreateNfDependencies } from "@/database/tables/nf/nf.interface";
import type { NfCreateInput } from "../nf.schemas";

export function injejctCreateNf({
    nf,
    clientsDb,
    findUser,
    findRole,
    findType,
    findService,
}: CreateNfDependencies) {
    return async function usecaseCreateNf(userId: string, data: NfCreateInput) {
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

        const validAcessKey = await nf.findNfNumber(data.acessKey.toString());
        if (validAcessKey) throw new Error("ACESS_KEY_EXIST");

        if (data.totalValue <= 0) throw new Error("VALUE_INVALID");

        const validClient = await clientsDb.findById(data.thirdPartyClientId);
        if (!validClient) throw new Error("CLIENT_NOT_EXIST");

        const validService = await findService.findId(data.servicesId);
        if (!validService) throw new Error("SERVICE_NOT_EXIST");

        data.active = true;

        const newNf = await nf.create({
            ...data,
            totalValue: data.totalValue.toFixed(2),
        });
        if (!newNf) throw new Error("ERROR_CREATE_NF");

        return newNf;
    };
}

import type { sendEmailNfDependencies } from "@/database/tables/nf/nf.interface";
import type { NfSendEmailInput } from "../nf.schemas";
import { sendEmailNf } from "@/lib/nodemailer/nodemailer";

export function injejctSendEmailNf({
    findNf,
    clientsDb,
    findType,
    findUser,
}: sendEmailNfDependencies) {
    return async function usecaseSendEmaNlNf(
        userId: string,
        nfData: NfSendEmailInput,
    ) {
        const sender = await findUser.findId(userId);

        const nf = await findNf.findNfNumber(nfData.numberNf);
        if (!nf) throw new Error("NF_NUMBER_INVALID");

        const type = await findType.findName(nfData.type);
        if (!type) throw new Error("TYPE_ID_INVALID");

        nfData.type = type.name.replace(/\s+/g, "_");

        const value = parseFloat(nfData.value);
        if (value <= 0) throw new Error("VALUE_INVALID");

        if (!nfData.emissionDate) throw new Error("DATE_INVALID");

        if (
            !nfData.acessKey ||
            nfData.acessKey.toLocaleString().length < 44 ||
            nfData.acessKey.toLocaleString().length > 50
        )
            throw new Error("ACESS_KEY_INVALID");

        const client = await clientsDb.findByCompanyName(
            nfData.clientName.toLocaleLowerCase(),
        );
        if (!client) throw new Error("CLIENT_ID_INVALID");

        if (!nfData.destinationEmail) throw new Error("EMAIL_INVALID");

        if (!nfData.details) {
            nfData.details = "cobrança de serviços prestados";
        }

        const response = await sendEmailNf(nfData);

        return response;
    };
}

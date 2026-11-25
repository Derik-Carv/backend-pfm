import type { sendEmailNfDependencies } from "@/database/tables/nf/nf.interface";
import { CompaniesRepository } from "@/database/tables/companies/companies.repository";
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
        accessibleCompanyIds?: string[],
    ) {
        const sender = await findUser.findId(userId);

        const nf = await findNf.findNfNumber(nfData.numberNf);
        if (
            !nf ||
            (accessibleCompanyIds &&
                nf.companyId &&
                !accessibleCompanyIds.includes(nf.companyId))
        )
            throw new Error("NF_NUMBER_INVALID");

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
            nf.companyId ?? undefined,
        );
        if (
            !client ||
            (accessibleCompanyIds &&
                client.companyId &&
                !accessibleCompanyIds.includes(client.companyId))
        )
            throw new Error("CLIENT_ID_INVALID");

        if (!nfData.destinationEmail) throw new Error("EMAIL_INVALID");

        if (!nfData.details) {
            nfData.details = "cobrança de serviços prestados";
        }

        let companySender:
            | { tradeName: string; phone?: string | null; email?: string | null }
            | undefined;
        if (nf.companyId) {
            const companiesRepo = new CompaniesRepository();
            const company = await companiesRepo.findById(nf.companyId);
            if (company) {
                companySender = {
                    tradeName: company.tradeName,
                    phone: company.phone,
                    email: company.email,
                };
            }
        }

        const response = await sendEmailNf({
            ...nfData,
            companySender,
        });

        return response;
    };
}

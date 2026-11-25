import type { sendEmailNfDependencies } from "@/database/tables/nf/nf.interface";
import { CompaniesRepository } from "@/database/tables/companies/companies.repository";
import { resolveSafeArchivePath, verifyRealArchivePath } from "@/lib/archivePath";
import { hasTenantAccess } from "@/lib/tenant";
import type { NfSendEmailInput } from "../nf.schemas";
import { sendEmailNf } from "@/lib/nodemailer/nodemailer";

export function injejctSendEmailNf({
    findNf,
    clientsDb,
    findUser,
}: sendEmailNfDependencies) {
    return async function usecaseSendEmaNlNf(
        userId: string,
        nfData: NfSendEmailInput,
        accessibleCompanyIds?: string[],
    ) {
        await findUser.findId(userId);

        if (!accessibleCompanyIds || accessibleCompanyIds.length === 0) {
            throw new Error("NF_NUMBER_INVALID");
        }

        const nf = nfData.nfId
            ? await findNf.findId(nfData.nfId)
            : nfData.numberNf
              ? await findNf.findNfNumber(nfData.numberNf, accessibleCompanyIds)
              : null;

        if (!nf || !hasTenantAccess(nf.companyId, accessibleCompanyIds)) {
            throw new Error("NF_NUMBER_INVALID");
        }

        if (!nf.pathFile || !nf.acessKey || !nf.numberNf) {
            throw new Error("NF_FILE_NOT_FOUND");
        }

        let attachmentPath: string;
        try {
            const candidatePath = resolveSafeArchivePath(nf.pathFile);
            attachmentPath = await verifyRealArchivePath(candidatePath);
        } catch {
            throw new Error("NF_FILE_NOT_FOUND");
        }

        const client = await clientsDb.findById(nf.thirdPartyClientId);
        if (!client || !hasTenantAccess(client.companyId, accessibleCompanyIds)) {
            throw new Error("CLIENT_ID_INVALID");
        }

        if (!nfData.destinationEmail) {
            throw new Error("EMAIL_INVALID");
        }

        const companiesRepo = new CompaniesRepository();
        const company = nf.companyId
            ? await companiesRepo.findById(nf.companyId)
            : null;
        const companySender = company
            ? {
                  tradeName: company.tradeName,
                  phone: company.phone,
                  email: company.email,
              }
            : undefined;

        const details =
            nfData.details?.trim() || "cobrança de serviços prestados";

        return await sendEmailNf({
            numberNf: nf.numberNf,
            value: String(nf.totalValue),
            emissionDate: nf.emissionDate,
            acessKey: nf.acessKey,
            clientName: client.tradeName || client.registeredCompanyName,
            details,
            destinationEmail: nfData.destinationEmail,
            attachmentPath,
            companySender,
        });
    };
}

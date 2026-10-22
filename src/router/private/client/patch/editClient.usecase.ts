import type { EditClientDependencies } from "@/database/tables/clients/clients.interface";
import type { EditClientInput } from "../client.schemas";
import { allRoles } from "@/lib/roles.list";
import { cpfValidateNormal } from "@/utils/checkCpf";

export function createEditClientUseCase({
    clientsDb,
    findUser,
    findRole,
}: EditClientDependencies) {
    return async function usecaseEditClient(
        userId: string,
        data: EditClientInput,
    ) {
        const allowedRoles = [
            allRoles.administrator,
            allRoles.manager,
            allRoles.finance,
        ];

        const user = await findUser.findId(userId);
        if (!user) throw new Error("USER_NOT_FOUND");

        const role = await findRole.findById(user.roleId);

        if (!role) throw new Error("ROLE_NOT_FOUND");

        const roleCheck = allowedRoles.includes(role.name);

        if (!roleCheck) {
            throw new Error("ROLE_ACESS_DENIED");
        }

        if (!data.id) throw new Error("ID_CLIENT_NOT_DEFINED");

        if (data.registeredCompanyName) {
            const companyExists = await clientsDb.findByCompanyName(
                data.registeredCompanyName,
            );

            if (companyExists && companyExists.id !== data.id) {
                throw new Error("COMPANY_NAME_ALREADY_EXISTS");
            }
        }

        if (data.tradeName) {
            const tradeNameExists = await clientsDb.findByTradeName(
                data.tradeName,
            );

            if (tradeNameExists && tradeNameExists.id !== data.id) {
                throw new Error("TRADE_NAME_ALREADY_EXISTS");
            }
        }

        if (data.cpf) {
            const cpfExists = await clientsDb.findByCpf(data.cpf);

            if (cpfExists && cpfExists.id !== data.id) {
                throw new Error("CPF_ALREADY_EXISTS");
            }
        }

        if (data.cnpj) {
            const cnpjExists = await clientsDb.findByCnpj(data.cnpj);

            if (cnpjExists && cnpjExists.id !== data.id) {
                throw new Error("CNPJ_ALREADY_EXISTS");
            }
        }

        if (data.cpf != null) {
            const cpf = await cpfValidateNormal(data.cpf);

            if (!cpf) throw new Error("INVALID_CPF");

            await clientsDb.editByCpf(data.id, data.cpf);
        }

        if (data.registeredCompanyName != null)
            await clientsDb.editByCompanyName(
                data.id,
                data.registeredCompanyName,
            );

        if (data.tradeName != null)
            await clientsDb.editByTradeName(data.id, data.tradeName);

        if (data.cnpj != null) await clientsDb.editByCnpj(data.id, data.cnpj);

        return await clientsDb.findById(data.id);
    };
}

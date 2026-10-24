import type { CreateClientDependencies } from "@/database/tables/clients/clients.interface";
import type { CreateClientInput } from "../client.schemas";
import { allRoles } from "@/lib/roles.list";

export function injectUseCaseCreateClient({
    clientsDb,
    findUser,
    findRole,
}: CreateClientDependencies) {
    return async function usecaseCreateClient(
        userId: string,
        data: CreateClientInput,
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

        if (!allowedRoles.includes(role.name)) {
            throw new Error("ROLE_ACESS_DENIED");
        }

        const companyExists = await clientsDb.findByCompanyName(
            data.registeredCompanyName,
        );

        if (companyExists) throw new Error("COMPANY_NAME_ALREADY_EXISTS");

        const tradeNameExists = await clientsDb.findByTradeName(data.tradeName);

        if (tradeNameExists) throw new Error("TRADE_NAME_ALREADY_EXISTS");

        if (data.cpf) {
            const cpfExists = await clientsDb.findByCpf(data.cpf);

            if (cpfExists) throw new Error("CPF_ALREADY_EXISTS");
        }

        if (data.cnpj) {
            const cnpjExists = await clientsDb.findByCnpj(data.cnpj);

            if (cnpjExists) throw new Error("CNPJ_ALREADY_EXISTS");
        }

        data.active = true;

        return await clientsDb.create(data);
    };
}

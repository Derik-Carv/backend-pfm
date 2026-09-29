import { ClientRepository } from "@/database/tables/clients/clients.repository";
import type { CreateClientInput } from "@/router/private/manager/client/client.schemas";
import { DatabaseSync } from "node:sqlite";

export async function usecaseCreateClient(data: CreateClientInput) {
    const clientsDb = new ClientRepository();

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

    return await clientsDb.create(data);
}

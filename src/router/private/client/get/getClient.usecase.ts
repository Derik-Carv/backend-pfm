import { ClientRepository } from "@/database/tables/clients/clients.repository";

export async function usecaseAllCLients() {
    const clients = new ClientRepository();

    const allCLients = await clients.findAll();

    if (!allCLients || allCLients.length === 0)
        throw new Error("CLIENTS_NOT_EXISTS");

    return allCLients;
}

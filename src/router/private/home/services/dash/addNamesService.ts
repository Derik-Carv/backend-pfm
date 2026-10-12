import { StatusServiceRepository } from "@/database/tables/statusService/statusService.repository";
import { ClientRepository } from "@/database/tables/clients/clients.repository";
import type { Services } from "@/database/tables/services/services.interface";

const statusRepository = new StatusServiceRepository();
const clientRepository = new ClientRepository();

export async function addNames(service: Services) {
    const [client, status] = await Promise.all([
        clientRepository.findById(service.clientId),
        service.statusServiceId
            ? statusRepository.findId(service.statusServiceId)
            : Promise.resolve(null),
    ]);

    return {
        ...service,
        clientName: client?.tradeName ?? null,
        statusName: status?.name ?? null,
    };
}

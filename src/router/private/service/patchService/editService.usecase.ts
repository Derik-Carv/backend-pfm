import { allRoles } from "@/lib/roles.list";
import { UsersRepository } from "@/database/tables/users/users.repository";
import { RoleRepository } from "@/database/tables/roles/roles.repository";
import { ServicesRepository } from "@/database/tables/services/services.repository";
import { StatusServiceRepository } from "@/database/tables/statusService/statusService.repository";
import { ClientRepository } from "@/database/tables/clients/clients.repository";
import type { ServiceEditInput } from "../myServicesList.schemas";
import { allStatusServices } from "@/lib/sttsService.list";

export async function usecaseEditService(
    userId: string,
    params: any,
    data: ServiceEditInput,
) {
    const allowedRoles = [
        allRoles.administrator,
        allRoles.manager,
        allRoles.finance,
    ];

    const status = [
        allStatusServices[0],
        allStatusServices[1],
        allStatusServices[2],
    ];

    console.log("VERIFICAR RESULTADAO DE TESTE DE PARAMS:\n", params);

    console.log("VERIFICAR RESULTADAO DE TESTE DE STATUS:\n", status);

    const userData = new UsersRepository();
    const roleData = new RoleRepository();
    const clientData = new ClientRepository();
    const statusData = new StatusServiceRepository();
    const servicesData = new ServicesRepository();

    const user = await userData.findId(userId);
    const userRole = await roleData.findById(user.roleId);

    if (!userRole) {
        throw new Error("ROLE_NOT_FOUND");
    }

    const roleCheck = allowedRoles.includes(userRole.name);

    if (!roleCheck) {
        throw new Error("ROLE_ACESS_DENIED");
    }

    if (data.clientId) {
        const validClient = await clientData.findById(data.clientId);

        if (!validClient) {
            throw new Error("CLIENT_NOT_FOUND");
        }
    }

    const defaultStatus = await statusData.findName("Fila");

    if (!data.statusServiceId) data.statusServiceId = defaultStatus.id;

    if (!data.statusServiceId) {
        throw new Error("STATUS_SERVICE_NOT_FOUND");
    }

    // const newService = await servicesData.create(data);

    // if (!newService) throw new Error("SERVICE_NOT_FOUND");

    // return newService;
}

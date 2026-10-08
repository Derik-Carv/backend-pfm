import { allRoles } from "@/lib/roles.list";
import { UsersRepository } from "@/database/tables/users/users.repository";
import { RoleRepository } from "@/database/tables/roles/roles.repository";
import { ServicesRepository } from "@/database/tables/services/services.repository";
import { StatusServiceRepository } from "@/database/tables/statusService/statusService.repository";
import { BundledRepository } from "@/database/tables/bundled/bundled.repository";
import type { CreateServiceInput } from "../services.schemas";

export async function usecaseCreateService(
    userId: string,
    data: CreateServiceInput,
) {
    const allowedRoles = [
        allRoles.administrator,
        allRoles.manager,
        allRoles.finance,
        allRoles.observer,
    ];

    const userData = new UsersRepository();
    const roleData = new RoleRepository();
    const statusData = new StatusServiceRepository();
    const servicesData = new ServicesRepository();
    const bundled = new BundledRepository();

    const user = await userData.findId(userId);
    const userRole = await roleData.findById(user.roleId);

    if (!userRole) {
        throw new Error("ROLE_NOT_FOUND");
    }

    const roleCheck = allowedRoles.includes(userRole.name);

    if (!roleCheck) {
        throw new Error("ROLE_ACESS_DENIED");
    }

    const defaultStatus = await statusData.findName("Fila");

    if (!data.statusServiceId) data.statusServiceId = defaultStatus.id;

    if (!data.statusServiceId) {
        throw new Error("STATUS_SERVICE_NOT_FOUND");
    }

    const newService = await servicesData.create(data);

    if (user) {
        const newBundled = await bundled.create({
            userId: user.id,
            serviceBundledId: newService.id,
            serviceNameBundled: newService.serviceName,
            priceBundled: newService.price,
            initialDateBundled: newService.initialDate,
            finishDateBundled: newService.finishDate,
        });
        if (!newBundled) {
            throw new Error("BUNDLED_CREATION_FAILED");
        }
    }

    return newService;
}

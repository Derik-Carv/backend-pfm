import { allRoles } from "@/lib/roles.list";
import { UsersRepository } from "@/database/tables/users/users.repository";
import { RoleRepository } from "@/database/tables/roles/roles.repository";
import { ServicesRepository } from "@/database/tables/services/services.repository";
import { BundledRepository } from "@/database/tables/bundled/bundled.repository";
import { StatusServiceRepository } from "@/database/tables/statusService/statusService.repository";
import { ClientRepository } from "@/database/tables/clients/clients.repository";
import type { Services } from "@/database/tables/services/services.interface";

export async function usecaseMyServicesHome(userId: string) {
    const allowedRoles = [
        allRoles.administrator,
        allRoles.manager,
        allRoles.finance,
        allRoles.observer,
        allRoles.colaborator,
    ];

    const userData = new UsersRepository();
    const roleData = new RoleRepository();
    const servicesData = new ServicesRepository();
    const bundledData = new BundledRepository();

    const user = await userData.findId(userId);
    if (!user) {
        throw new Error("USER_NOT_FOUND");
    }

    const userRole = await roleData.findById(user.roleId);
    if (!userRole) {
        throw new Error("ROLE_NOT_FOUND");
    }

    const roleCheck = allowedRoles.includes(userRole.name);
    if (!roleCheck) {
        throw new Error("ROLE_ACESS_DENIED");
    }

    if (userRole.name === allRoles.colaborator) {
        const userBundles = await bundledData.findByUserId(userId);
        const serviceIds = userBundles.map((b) => b.serviceBundledId);

        if (serviceIds.length === 0) {
            return {
                highValueServices: [],
                recentServices: [],
                oldestServices: [],
            };
        }

        const [highValueServices, recentServices, oldestServices] =
            await Promise.all([
                servicesData.findHighValueByIds(serviceIds, 3),
                servicesData.findRecentByIds(serviceIds, 3),
                servicesData.findOldestByIds(serviceIds, 3),
            ]);

        const [highValueWithNames, recentWithNames, oldestWithNames] =
            await Promise.all([
                Promise.all(highValueServices.map(addNames)),
                Promise.all(recentServices.map(addNames)),
                Promise.all(oldestServices.map(addNames)),
            ]);

        return {
            highValueServices: highValueWithNames,
            recentServices: recentWithNames,
            oldestServices: oldestWithNames,
        };
    }

    const [highValueServices, recentServices, oldestServices] =
        await Promise.all([
            servicesData.findHighValue(3),
            servicesData.findRecent(3),
            servicesData.findOldest(3),
        ]);

    const [highValueWithNames, recentWithNames, oldestWithNames] =
        await Promise.all([
            Promise.all(highValueServices.map(addNames)),
            Promise.all(recentServices.map(addNames)),
            Promise.all(oldestServices.map(addNames)),
        ]);

    return {
        highValueServices: highValueWithNames,
        recentServices: recentWithNames,
        oldestServices: oldestWithNames,
    };
}

const statusRepository = new StatusServiceRepository();
const clientRepository = new ClientRepository();

async function addNames(service: Services) {
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

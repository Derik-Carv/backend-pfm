import { allRoles } from "@/lib/roles.list";
import { UsersRepository } from "@/database/tables/users/users.repository";
import { RoleRepository } from "@/database/tables/roles/roles.repository";
import { ServicesRepository } from "@/database/tables/services/services.repository";
import { BundledRepository } from "@/database/tables/bundled/bundled.repository";

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

        return { highValueServices, recentServices, oldestServices };
    }

    const [highValueServices, recentServices, oldestServices] =
        await Promise.all([
            servicesData.findHighValue(3),
            servicesData.findRecent(3),
            servicesData.findOldest(3),
        ]);

    return { highValueServices, recentServices, oldestServices };
}

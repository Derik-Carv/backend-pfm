import { allRoles } from "@/lib/roles.list";
import { UsersRepository } from "@/database/tables/users/users.repository";
import { RoleRepository } from "@/database/tables/roles/roles.repository";
import { ServicesRepository } from "@/database/tables/services/services.repository";
import { BundledRepository } from "@/database/tables/bundled/bundled.repository";

export async function usecaseMyServicesHomeFind(userId: string, finder: any) {
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

    const serviceFind = finder.finder as string;
    const serviceType = finder.type as string;

    if (userRole.name === allRoles.colaborator) {
        const userBundles = await bundledData.findByUserId(userId);
        const serviceIds = userBundles.map((b) => b.serviceBundledId);

        console.log("Finder:", finder);
        console.log("Service IDs:", serviceIds);

        console.log("Service Find:", serviceFind);
        console.log("Service Type:", serviceType);

        if (serviceIds.length === 0) {
            return {
                list: [],
            };
        }

        // if (serviceType === "id") {
        //     const services = await servicesData.findId(serviceFind);
        //     return services ? { list: [services] } : { list: [] };
        // }

        // if (serviceType === "client") {
        //     const services = await servicesData.findClientServices(serviceFind);
        //     return services ? { list: [services] } : { list: [] };
        // }

        // if (serviceType === "price") {
        //     const services = await servicesData.findValue(serviceFind);
        //     return services ? { list: [services] } : { list: [] };
        // }

        // if (serviceType === "initialdate") {
        //     const services =
        //         await servicesData.findInitialServiceDate(serviceFind);
        //     return services ? { list: [services] } : { list: [] };
        // }

        // if (serviceType === "finishdate") {
        //     const services =
        //         await servicesData.findFinishServiceDate(serviceFind);
        //     return services ? { list: [services] } : { list: [] };
        // }
    }

    if (serviceType === "id") {
        const services = await servicesData.findId(serviceFind);
        return services ? { list: [services] } : { list: [] };
    }

    if (serviceType === "client") {
        const services = await servicesData.findClientServices(serviceFind);
        return services ? { list: [services] } : { list: [] };
    }

    if (serviceType === "price") {
        const services = await servicesData.findValue(serviceFind);
        return services ? { list: [services] } : { list: [] };
    }

    if (serviceType === "initialdate") {
        const services = await servicesData.findInitialServiceDate(serviceFind);
        return services ? { list: [services] } : { list: [] };
    }

    if (serviceType === "finishdate") {
        const services = await servicesData.findFinishServiceDate(serviceFind);
        return services ? { list: [services] } : { list: [] };
    }

    return { list: [] };
}

import { allRoles } from "@/lib/roles.list";
import { UsersRepository } from "@/database/tables/users/users.repository";
import { RoleRepository } from "@/database/tables/roles/roles.repository";
import { ServicesRepository } from "@/database/tables/services/services.repository";
import { BundledRepository } from "@/database/tables/bundled/bundled.repository";
import { id } from "zod/locales";

export async function usecaseMyServicesList(userId: string) {
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

    if (userRole.name === allRoles.colaborator) {
        const userBundles = await bundledData.findByUserId(userId);

        const serviceIds = [
            ...new Set(userBundles.map((item) => item.serviceBundledId)),
        ];

        if (!serviceIds || serviceIds.length === 0)
            throw new Error("SERVICE_NOT_FOUND");

        const services = await Promise.all(
            serviceIds.map((id) => servicesData.findId(id)),
        );

        const serviceList = services.filter(Boolean);

        return { list: serviceList };
    }

    if (userRole.name != allRoles.colaborator) {
        const services = await servicesData.findActives();

        if (!services || services.length === 0)
            throw new Error("SERVICE_NOT_FOUND");

        return { list: services };
    }

    throw new Error("SERVICE_NOT_FOUND");
}

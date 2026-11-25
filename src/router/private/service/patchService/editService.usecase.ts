import { UsersRepository } from "@/database/tables/users/users.repository";
import { RoleRepository } from "@/database/tables/roles/roles.repository";
import { ServicesRepository } from "@/database/tables/services/services.repository";
import type { CreateServicesDatabaseInput } from "@/database/tables/services/services.interface";
import { StatusServiceRepository } from "@/database/tables/statusService/statusService.repository";
import { ClientRepository } from "@/database/tables/clients/clients.repository";
import { hasTenantAccess } from "@/lib/tenant";
import type { ServiceEditInput } from "../myServicesList.schemas";

const userData = new UsersRepository();
const roleData = new RoleRepository();
const clientData = new ClientRepository();
const statusData = new StatusServiceRepository();
const servicesData = new ServicesRepository();

export async function usecaseEditService(
    userId: string,
    params: any,
    data: ServiceEditInput,
    accessibleCompanyIds?: string[],
) {
    const receivedId = params.id;

    const user = await userData.findId(userId);
    if (!user) {
        throw new Error("USER_NOT_FOUND");
    }

    const userRole = await roleData.findById(user.roleId);

    if (!userRole) {
        throw new Error("ROLE_NOT_FOUND");
    }

    const existingService = await servicesData.findId(receivedId);
    if (!existingService) {
        throw new Error("SERVICE_NOT_FOUND");
    }

    if (!hasTenantAccess(existingService.companyId, accessibleCompanyIds)) {
        throw new Error("ROLE_ACESS_DENIED");
    }

    const updates: Partial<CreateServicesDatabaseInput> = {};

    if (data.serviceName) updates.serviceName = data.serviceName;
    if (data.price) updates.price = data.price;
    if (data.initialDate) updates.initialDate = data.initialDate;
    if (data.finishDate) updates.finishDate = data.finishDate;

    if (data.clientId) {
        const validClient = await clientData.findById(data.clientId);
        if (
            !validClient ||
            !hasTenantAccess(validClient.companyId, accessibleCompanyIds)
        ) {
            throw new Error("CLIENT_NOT_FOUND");
        }
        updates.clientId = data.clientId;
    }

    if (data.details !== undefined && data.details !== null) {
        if (data.details.length === 0) {
            throw new Error("NEW_SERVICE_DETAILS_INVALID");
        }
        updates.details = data.details;
    }

    if (data.statusServiceId) {
        const validStatus = await statusData.findId(data.statusServiceId);
        if (!validStatus) throw new Error("NEW_SERVICE_STATUS_INVALID");
        updates.statusServiceId = data.statusServiceId;
    }

    const updatedService = await servicesData.updateFields(receivedId, updates);
    if (!updatedService) throw new Error("SERVICE_NOT_FOUND");

    return updatedService;
}

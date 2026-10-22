import { allRoles } from "@/lib/roles.list";
import { UsersRepository } from "@/database/tables/users/users.repository";
import { RoleRepository } from "@/database/tables/roles/roles.repository";
import { ServicesRepository } from "@/database/tables/services/services.repository";
import { StatusServiceRepository } from "@/database/tables/statusService/statusService.repository";
import { ClientRepository } from "@/database/tables/clients/clients.repository";
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

    if (data.serviceName) {
        const newName = await servicesData.editName(
            receivedId,
            data.serviceName,
        );
        if (!newName) throw new Error("SERVICE_NOT_FOUND");

        return newName;
    }

    if (data.price) {
        const newPrice = await servicesData.editPrice(receivedId, data.price);
        if (!newPrice) throw new Error("SERVICE_NOT_FOUND");

        return newPrice;
    }

    if (data.initialDate) {
        const newDate = await servicesData.editInitialDate(
            receivedId,
            data.initialDate,
        );
        if (!newDate) throw new Error("SERVICE_NOT_FOUND");

        return newDate;
    }

    if (data.finishDate) {
        const newDate = await servicesData.editFinishDate(
            receivedId,
            data.finishDate,
        );
        if (!newDate) throw new Error("SERVICE_NOT_FOUND");

        return newDate;
    }

    if (data.clientId) {
        const validClient = await clientData.findById(data.clientId);

        if (!validClient) throw new Error("CLIENT_NOT_FOUND");

        const newClient = await servicesData.editClient(
            receivedId,
            data.clientId,
        );
        if (!newClient) throw new Error("SERVICE_NOT_FOUND");

        return newClient;
    }

    if (data.details) {
        if (data.details.length === 0)
            throw new Error("NEW_SERVICE_DETAILS_INVALID");

        const newDetails = await servicesData.editDetails(
            receivedId,
            data.details,
        );
        if (!newDetails) throw new Error("SERVICE_NOT_FOUND");

        return newDetails;
    }

    if (data.statusServiceId) {
        const validStatus = await statusData.findId(data.statusServiceId);

        if (!validStatus) throw new Error("NEW_SERVICE_STATUS_INVALID");

        const newStatus = await servicesData.editStatus(
            receivedId,
            data.statusServiceId,
        );
        if (!newStatus) throw new Error("SERVICE_NOT_FOUND");

        return newStatus;
    }
}

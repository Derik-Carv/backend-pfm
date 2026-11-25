import type { ClientDependencies } from "@/database/tables/clients/clients.interface";
import { BundledRepository } from "@/database/tables/bundled/bundled.repository";
import { maskCpf } from "@/lib/lgpd/legal.constants";
import { allRoles } from "@/lib/roles.list";
import type { Pagination } from "@/router/pagination.schema";

export function injectUseCaseActiveClients({ clientsDb }: ClientDependencies) {
    return async function usecaseAllCLients(
        pagination: Pagination,
        companyIds?: string[],
        actorUserId?: string,
        actorRole?: string,
    ) {
        const offset = (pagination.page - 1) * pagination.limit;

        let result: { list: Awaited<ReturnType<typeof clientsDb.findPage>>["list"]; total: number };
        if (actorRole === allRoles.colaborator) {
            const bundledRepo = new BundledRepository();
            const userBundles = actorUserId
                ? await bundledRepo.findByUserId(actorUserId)
                : [];
            const clientIds = [
                ...new Set(userBundles.map((b) => b.clientIdBundled)),
            ];
            result = await clientsDb.findPageByIds(
                clientIds,
                pagination.limit,
                offset,
                companyIds,
            );
        } else {
            result = await clientsDb.findPage(
                pagination.limit,
                offset,
                companyIds,
            );
        }

        const sanitizedList =
            actorRole === allRoles.colaborator
                ? result.list.map((c) => ({
                      ...c,
                      cpf: c.cpf ? maskCpf(c.cpf) : c.cpf,
                  }))
                : result.list;

        return {
            list: sanitizedList,
            pagination: {
                page: pagination.page,
                limit: pagination.limit,
                total: result.total,
                totalPages: Math.ceil(result.total / pagination.limit),
                hasMore: offset + result.list.length < result.total,
            },
        };
    };
}

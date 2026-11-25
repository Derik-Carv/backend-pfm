import type { INF } from "@/database/tables/nf/nf.interface";
import { hasTenantAccess } from "@/lib/tenant";

export function injectDeactivateNf({
    nf,
}: {
    nf: Pick<INF, "findId" | "deactivate">;
}) {
    return async function deactivateNf(
        id: string,
        reason: string,
        userId: string,
        accessibleCompanyIds?: string[],
    ) {
        const note = await nf.findId(id);
        if (!note || !hasTenantAccess(note.companyId, accessibleCompanyIds)) {
            throw new Error("NF_NOT_FOUND");
        }
        if (!note.active) {
            throw new Error("NF_ALREADY_INACTIVE");
        }
        if (note.cancelDate) {
            throw new Error("NF_ALREADY_CANCELLED");
        }

        const deactivated = await nf.deactivate(id, reason, userId);
        if (!deactivated) {
            throw new Error("NF_ALREADY_INACTIVE");
        }

        return deactivated;
    };
}

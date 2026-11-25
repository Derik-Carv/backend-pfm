import type { INF } from "@/database/tables/nf/nf.interface";
import { hasTenantAccess } from "@/lib/tenant";

export function injectActivateNf({
    nf,
}: {
    nf: Pick<INF, "findId" | "activate">;
}) {
    return async function activateNf(id: string, accessibleCompanyIds?: string[]) {
        const note = await nf.findId(id);
        if (!note || !hasTenantAccess(note.companyId, accessibleCompanyIds))
            throw new Error("NF_NOT_FOUND");
        if (note.active) throw new Error("NF_ALREADY_ACTIVE");

        const activated = await nf.activate(id);
        if (!activated) throw new Error("NF_ALREADY_ACTIVE");
        return activated;
    };
}

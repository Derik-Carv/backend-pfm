import type { INF } from "@/database/tables/nf/nf.interface";

export function injectDeactivateNf({
    nf,
}: {
    nf: Pick<INF, "findId" | "deactivate">;
}) {
    return async function deactivateNf(
        id: string,
        reason: string,
        userId: string,
    ) {
        const note = await nf.findId(id);
        if (!note) {
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

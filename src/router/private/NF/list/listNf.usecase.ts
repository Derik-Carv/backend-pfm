import type {
    INF,
    NfListFilters,
} from "@/database/tables/nf/nf.interface";
import type { NfListQuery } from "../nf.schemas";

export function injectListNf({ nf }: { nf: Pick<INF, "findPage"> }) {
    return async function listNf(query: NfListQuery) {
        const offset = (query.page - 1) * query.limit;
        const filters: NfListFilters = {
            noteNumber: query.note_number,
            accessKey: query.access_key,
            minValue: query.min_value?.toFixed(2),
            maxValue: query.max_value?.toFixed(2),
            startDate: query.start_date,
            endDate: query.end_date,
            status: query.status,
        };
        const result = await nf.findPage(filters, query.limit, offset);

        return {
            list: result.list,
            pagination: {
                page: query.page,
                limit: query.limit,
                total: result.total,
                totalPages: Math.ceil(result.total / query.limit),
                hasMore: offset + result.list.length < result.total,
            },
        };
    };
}

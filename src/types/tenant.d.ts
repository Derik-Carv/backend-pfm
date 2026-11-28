import type { Company } from "@/database/tables/companies/companies.interface";

export interface TenantContext {
    activeCompanyId: string;
    accountType: "business" | "personal";
    allowManualFinanceCodes: boolean;
    isMother: boolean;
    motherId: string;
    accessibleCompanyIds: string[];
    isConsolidated: boolean;
    activeCompany: Company;
}

declare module "fastify" {
    interface FastifyRequest {
        tenant?: TenantContext;
    }
}

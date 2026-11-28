import type { FastifyReply, FastifyRequest } from "fastify";
import { UsersRepository } from "@/database/tables/users/users.repository";
import { RoleRepository } from "@/database/tables/roles/roles.repository";
import { CompaniesRepository } from "@/database/tables/companies/companies.repository";
import { UserCompaniesRepository } from "@/database/tables/userCompanies/userCompanies.repository";
import { isValidUuid } from "@/lib/tenant";

const FIRST_LOGIN_ALLOWED_ROUTES = new Set([
    "/account/password",
    "/account/legal/accept",
    "/account/privacy/me",
]);

export async function authMiddleware(
    request: FastifyRequest,
    reply: FastifyReply,
) {
    try {
        await request.jwtVerify();
    } catch {
        return reply.status(401).send({
            message: "Unauthorized: Invalid or expired token",
        });
    }

    const userRepository = new UsersRepository();
    const roleRepository = new RoleRepository();
    const user = await userRepository.findId(request.user.id);

    if (!user?.active) {
        return reply.status(401).send({
            message: "Unauthorized: User is inactive or does not exist",
        });
    }

    if (
        (typeof request.user.tv === "number" &&
            request.user.tv !== user.tokenVersion) ||
        (request.user.tv === undefined && user.tokenVersion > 1)
    ) {
        return reply.status(401).send({
            message: "Unauthorized: Token has been revoked",
        });
    }

    const role = await roleRepository.findById(user.roleId);

    if (!role?.active) {
        return reply.status(401).send({
            message: "Unauthorized: User role is inactive or does not exist",
        });
    }

    request.user.role = role.name;
    request.user.cpf = user.cpf;

    const routeUrl =
        request.routeOptions.url ?? request.url.split("?")[0] ?? "";

    if (
        user.passwordChangeRequired &&
        !FIRST_LOGIN_ALLOWED_ROUTES.has(routeUrl)
    ) {
        return reply.status(403).send({
            message: "Password change required before accessing this resource",
        });
    }

    // Tenant Resolution
    const companiesRepo = new CompaniesRepository();
    const userCompaniesRepo = new UserCompaniesRepository();

    const rawRequestedCompanyId = request.headers["x-company-id"];
    const requestedCompanyId =
        typeof rawRequestedCompanyId === "string"
            ? rawRequestedCompanyId.trim()
            : undefined;

    if (requestedCompanyId && !isValidUuid(requestedCompanyId)) {
        return reply.status(400).send({
            message: "Invalid x-company-id header",
        });
    }

    const requestedViewScope =
        (request.headers["x-view-scope"] as string | undefined) || "single";

    let targetCompanyId = requestedCompanyId || user.primaryCompanyId;

    if (!targetCompanyId) {
        const userComps = await userCompaniesRepo.findCompaniesByUserId(user.id);
        if (userComps.length > 0) {
            targetCompanyId = userComps[0].id;
        }
    }

    if (!targetCompanyId) {
        const canSkipTenant =
            role.name === "administrator" ||
            routeUrl.startsWith("/account/") ||
            routeUrl === "/companies/me";

        if (canSkipTenant) {
            return;
        }

        return reply.status(403).send({
            message: "Forbidden: No active company context assigned to user",
        });
    }

    const targetCompany = await companiesRepo.findById(targetCompanyId);
    if (!targetCompany || !targetCompany.active) {
        return reply.status(403).send({
            message: "Forbidden: Target company is inactive or does not exist",
        });
    }

    // Valida se o usuário tem permissão para a empresa ou é admin SaaS
    if (role.name !== "administrator") {
        let hasPermission = user.primaryCompanyId === targetCompanyId;

        if (!hasPermission) {
            const userComps = await userCompaniesRepo.findCompaniesByUserId(user.id);
            const hasDirectAccess = userComps.some((c) => c.id === targetCompanyId);
            const hasMotherAccess =
                role.name !== "colaborator" &&
                targetCompany.motherId !== null &&
                (user.primaryCompanyId === targetCompany.motherId ||
                    userComps.some((c) => c.id === targetCompany.motherId));

            hasPermission = hasDirectAccess || hasMotherAccess;
        }

        if (!hasPermission) {
            return reply.status(403).send({
                message: "Forbidden: You do not have access to this company",
            });
        }
    }

    const accountType: "business" | "personal" =
        targetCompany.accountType === "personal" ? "personal" : "business";
    const isMother = targetCompany.motherId === null;
    const motherId = isMother ? targetCompany.id : targetCompany.motherId!;
    const isConsolidated =
        accountType === "business" &&
        requestedViewScope === "consolidated" &&
        isMother &&
        role.name !== "colaborator";

    let accessibleCompanyIds = [targetCompany.id];

    if (isConsolidated) {
        const branches = await companiesRepo.findBranchesByMotherId(targetCompany.id);
        accessibleCompanyIds = [targetCompany.id, ...branches.map((b) => b.id)];
    }

    request.tenant = {
        activeCompanyId: targetCompany.id,
        accountType,
        allowManualFinanceCodes: Boolean(targetCompany.allowManualFinanceCodes),
        isMother,
        motherId,
        accessibleCompanyIds,
        isConsolidated,
        activeCompany: targetCompany,
    };
}

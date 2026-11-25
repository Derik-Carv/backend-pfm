const UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUuid(value: string | null | undefined): boolean {
    return typeof value === "string" && UUID_REGEX.test(value.trim());
}

export function hasTenantAccess(
    recordCompanyId: string | null | undefined,
    accessibleCompanyIds?: string[],
): boolean {
    return Boolean(
        recordCompanyId &&
            accessibleCompanyIds &&
            accessibleCompanyIds.length > 0 &&
            accessibleCompanyIds.includes(recordCompanyId),
    );
}

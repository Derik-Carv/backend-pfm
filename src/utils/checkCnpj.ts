import { maskCpf } from "@/lib/lgpd/legal.constants";

export function cnpjClean(cnpj: string): string {
    return cnpj.replace(/\D/g, "");
}

export function cnpjValidate(cnpj: string): boolean {
    const cleaned = cnpjClean(cnpj);

    if (!/^\d{14}$/.test(cleaned)) return false;
    if (/^(\d)\1{13}$/.test(cleaned)) return false;

    const calcDigit = (sliceLen: number, weights: number[]) => {
        const sum = weights.reduce(
            (acc, weight, idx) => acc + Number(cleaned[idx]) * weight,
            0,
        );
        const remainder = sum % 11;
        return remainder < 2 ? 0 : 11 - remainder;
    };

    const firstDigit = calcDigit(12, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
    const secondDigit = calcDigit(13, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);

    return (
        firstDigit === Number(cleaned[12]) &&
        secondDigit === Number(cleaned[13])
    );
}

export function maskTenantDocument(
    doc: string | null | undefined,
    accountType?: string | null,
): string {
    if (!doc) return "";
    if (accountType === "personal" || /^\d{11}$/.test(doc)) {
        return maskCpf(doc);
    }
    return doc;
}

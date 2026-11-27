const DECIMAL_STRING_REGEX = /^(\d+)(?:[.,](\d{1,2}))?$/;

/**
 * Converte string decimal ("1250.50", "1250,50") ou número finito para centavos BigInt
 * sem passar por aritmética IEEE-754 de ponto flutuante.
 */
export function parseDecimalToCents(raw: string | number): bigint {
    if (typeof raw === "number") {
        if (!Number.isFinite(raw) || raw < 0) {
            throw new Error("INVALID_MONETARY_AMOUNT");
        }
        return parseDecimalToCents(raw.toFixed(2));
    }

    const trimmed = raw.trim();
    const match = DECIMAL_STRING_REGEX.exec(trimmed);
    if (!match) {
        throw new Error("INVALID_MONETARY_AMOUNT");
    }

    const wholePart = BigInt(match[1]);
    const fracPart = BigInt((match[2] ?? "").padEnd(2, "0"));
    return wholePart * 100n + fracPart;
}

/**
 * Formata centavos BigInt para string decimal com 2 casas ("1250.50").
 */
export function centsToDecimalString(cents: bigint): string {
    const isNegative = cents < 0n;
    const abs = isNegative ? -cents : cents;
    const whole = abs / 100n;
    const frac = (abs % 100n).toString().padStart(2, "0");
    return `${isNegative ? "-" : ""}${whole.toString()}.${frac}`;
}

/**
 * Converte BigInt em number garantindo que está dentro do range seguro do JS.
 */
export function centsToSafeNumber(cents: bigint): number {
    if (
        cents > BigInt(Number.MAX_SAFE_INTEGER) ||
        cents < BigInt(Number.MIN_SAFE_INTEGER)
    ) {
        throw new Error("MONETARY_OVERFLOW");
    }
    return Number(cents);
}

/**
 * Converte inteiro validado para BigInt garantindo valor >= 0 (ou > 0 quando exigido).
 */
export function intToCents(value: number, opts?: { positive?: boolean }): bigint {
    if (!Number.isSafeInteger(value)) {
        throw new Error("INVALID_CENTS_INTEGER");
    }
    const cents = BigInt(value);
    if (opts?.positive ? cents <= 0n : cents < 0n) {
        throw new Error("INVALID_MONETARY_AMOUNT");
    }
    return cents;
}

/**
 * Calcula o valor líquido do título no servidor:
 * net = original + interest + fine - discount
 */
export function calculateEntryNetCents(input: {
    originalAmountCents: bigint;
    discountCents: bigint;
    interestCents: bigint;
    fineCents: bigint;
}): bigint {
    const { originalAmountCents, discountCents, interestCents, fineCents } = input;
    if (
        originalAmountCents <= 0n ||
        discountCents < 0n ||
        interestCents < 0n ||
        fineCents < 0n
    ) {
        throw new Error("INVALID_MONETARY_AMOUNT");
    }

    const net = originalAmountCents + interestCents + fineCents - discountCents;
    if (net <= 0n) {
        throw new Error("NET_AMOUNT_MUST_BE_POSITIVE");
    }
    return net;
}

/**
 * Divide um total em centavos em N parcelas sem perder centavos por arredondamento.
 * O resto da divisão inteira é somado na 1ª parcela.
 */
export function splitAmountIntoInstallments(
    totalCents: bigint,
    installments: number,
): bigint[] {
    if (totalCents <= 0n || !Number.isInteger(installments) || installments < 1) {
        throw new Error("INVALID_INSTALLMENTS");
    }
    const count = BigInt(installments);
    const base = totalCents / count;
    if (base <= 0n) {
        throw new Error("INSTALLMENT_AMOUNT_TOO_SMALL");
    }
    const remainder = totalCents % count;
    const parts: bigint[] = [];
    for (let i = 0; i < installments; i++) {
        parts.push(i === 0 ? base + remainder : base);
    }
    return parts;
}

export type EntryType = "receivable" | "payable";
export type EntryStatus =
    | "draft"
    | "pending"
    | "partially_paid"
    | "paid"
    | "overdue"
    | "cancelled";

/**
 * Calcula totais de uma baixa e o delta líquido aplicado à conta financeira.
 * - `totalSettledCents = principal + interest + fine - discount`
 * - Em recebimentos (`receivable`), o saldo da conta aumenta por `totalSettledCents - gatewayFeeCents`.
 * - Em pagamentos (`payable`), o saldo da conta diminui por `totalSettledCents + gatewayFeeCents`.
 */
export function calculateSettlementTotals(input: {
    entryType: EntryType;
    principalCents: bigint;
    interestCents: bigint;
    fineCents: bigint;
    discountCents: bigint;
    gatewayFeeCents: bigint;
}): { totalSettledCents: bigint; accountDeltaCents: bigint } {
    const {
        entryType,
        principalCents,
        interestCents,
        fineCents,
        discountCents,
        gatewayFeeCents,
    } = input;

    if (
        principalCents <= 0n ||
        interestCents < 0n ||
        fineCents < 0n ||
        discountCents < 0n ||
        gatewayFeeCents < 0n
    ) {
        throw new Error("INVALID_SETTLEMENT_AMOUNTS");
    }

    const totalSettledCents =
        principalCents + interestCents + fineCents - discountCents;

    if (totalSettledCents <= 0n) {
        throw new Error("SETTLEMENT_TOTAL_MUST_BE_POSITIVE");
    }

    if (entryType === "receivable" && gatewayFeeCents > totalSettledCents) {
        throw new Error("GATEWAY_FEE_EXCEEDS_SETTLEMENT");
    }

    const accountDeltaCents =
        entryType === "receivable"
            ? totalSettledCents - gatewayFeeCents
            : -(totalSettledCents + gatewayFeeCents);

    return {
        totalSettledCents,
        accountDeltaCents,
    };
}

/**
 * Determina o próximo status de um título após baixa ou estorno.
 */
export function computeEntryStatusAfterSettlement(input: {
    netAmountCents: bigint;
    newSettledAmountCents: bigint;
    dueDate: string;
    todayIso: string;
}): Exclude<EntryStatus, "draft" | "cancelled"> {
    const { netAmountCents, newSettledAmountCents, dueDate, todayIso } = input;
    if (newSettledAmountCents < 0n || newSettledAmountCents > netAmountCents) {
        throw new Error("SETTLED_AMOUNT_OUT_OF_BOUNDS");
    }
    if (newSettledAmountCents === netAmountCents) {
        return "paid";
    }
    if (newSettledAmountCents > 0n) {
        return "partially_paid";
    }
    return dueDate < todayIso ? "overdue" : "pending";
}

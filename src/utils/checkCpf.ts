export function cpfClean(cpf: string) {
    return cpf.replace(/\D/g, "");
}

export async function cpfValidateNormal(cpf: string) {
    const cpfFormat = cpfClean(cpf);

    if (!/^\d{11}$/.test(cpfFormat)) return false;
    if (/^(\d)\1{10}$/.test(cpfFormat)) return false;

    const cpfCalc = (weight: number) => {
        const soma = [...cpfFormat.slice(0, weight - 1)].reduce(
            (acc, digit, idx) => acc + Number(digit) * (weight - idx),
            0,
        );
        const resto = (soma * 10) % 11;
        return resto < 10 ? resto : 0;
    };

    return (
        cpfCalc(10) === Number(cpfFormat[9]) &&
        cpfCalc(11) === Number(cpfFormat[10])
    );
}

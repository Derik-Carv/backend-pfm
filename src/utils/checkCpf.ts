export function cpfClean(cpf: string) {
    return cpf.replace(/[^\w]/g, "");
}

export async function cpfValidateNormal(cpf: string) {
    // check brazilian CPF
    const cpfFormat = await cpfClean(cpf); // keep only numbers and letters

    if (/^(\d)\1{10}$/.test(cpfFormat)) return false; // reject sequence with only number

    const cpfCalc = (weight: number) => {
        const soma = [...cpfFormat.slice(0, weight - 1)].reduce(
            (acc, digit, idx) => acc + Number(digit) * (weight - idx),
            0,
        );
        const resto = (soma * 10) % 11;
        return resto < 10 ? resto : 0;
    };

    return cpfCalc(10) === Number(cpf[9]) && cpfCalc(11) === Number(cpf[10]);
}

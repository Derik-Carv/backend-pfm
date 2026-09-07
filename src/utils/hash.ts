export async function hashPassword(password: string): Promise<string> {
    return Bun.password.hash(password, {
        algorithm: "argon2id",
        memoryCost: 4096,
        timeCost: 3,
    });
}

export async function verifyPassword(
    password: string,
    hashedPassword: string,
): Promise<boolean> {
    return Bun.password.verify(password, hashedPassword);
}

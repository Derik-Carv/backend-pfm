const sharedRedact = [
    "req.headers.authorization",
    "req.headers.cookie",
    "req.headers.x-webhook-signature",
    "body.password",
    "body.currentPassword",
    "body.newPassword",
    "body.adminPassword",
    "body.cpf",
    "body.adminCpf",
    "body.cnpj",
    "body.email",
    "body.adminEmail",
    "body.destinationEmail",
    "body.code",
    "body.pixKey",
    "body.bankAccount",
    "body.agency",
    "body.accountNumber",
    "body.certPassword",
    "body.pfx",
    "body.privateKey",
    "body.clientSecret",
    "body.webhookSecret",
    "body.accessToken",
    "body.refreshToken",
    "body.authorizationCode",
    "*.password",
    "*.currentPassword",
    "*.newPassword",
    "*.adminPassword",
    "*.adminPasswordHash",
    "*.cpf",
    "*.adminCpf",
    "*.cnpj",
    "*.email",
    "*.adminEmail",
    "*.destinationEmail",
    "*.token",
    "*.code",
    "*.pixKey",
    "*.bankAccount",
    "*.agency",
    "*.accountNumber",
    "*.certPassword",
    "*.pfx",
    "*.privateKey",
    "*.clientSecret",
    "*.webhookSecret",
    "*.accessToken",
    "*.refreshToken",
    "*.authorizationCode",
    "password",
    "adminPasswordHash",
    "cpf",
    "adminCpf",
    "cnpj",
    "email",
    "adminEmail",
    "destinationEmail",
    "token",
    "code",
    "pixKey",
    "bankAccount",
    "agency",
    "accountNumber",
    "certPassword",
    "pfx",
    "privateKey",
    "clientSecret",
    "webhookSecret",
    "accessToken",
    "refreshToken",
    "authorizationCode",
];

const axiomToken = (process.env.AXIOM_TOKEN ?? process.env.LOGTOKEN ?? "").trim();
const axiomDataset = process.env.AXIOM_DATASET ?? "backend-pfm";
const isProduction = (Bun.env.NODE_ENV ?? process.env.NODE_ENV) === "production";

const MAX_AXIOM_BUFFER_SIZE = 500;
const AXIOM_BATCH_SIZE = 50;
const AXIOM_FLUSH_INTERVAL_MS = 5000;

export function resolveSafeAxiomUrl(
    rawUrl: string | undefined,
    isProd = isProduction,
): string {
    const candidate = rawUrl?.trim() || "https://api.axiom.co";
    let parsed: URL;
    try {
        parsed = new URL(candidate);
    } catch {
        throw new Error("AXIOM_URL inválido.");
    }
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
        throw new Error("AXIOM_URL deve usar protocolo HTTP ou HTTPS.");
    }
    if (isProd && parsed.protocol !== "https:") {
        throw new Error("AXIOM_URL deve usar HTTPS em produção.");
    }
    return parsed.toString().replace(/\/+$/, "");
}

export function mapPinoLevel(level: unknown): string {
    if (typeof level === "string") {
        return level;
    }
    if (typeof level !== "number") {
        return "info";
    }
    if (level <= 10) return "trace";
    if (level <= 20) return "debug";
    if (level <= 30) return "info";
    if (level <= 40) return "warn";
    if (level <= 50) return "error";
    if (level <= 60) return "fatal";
    return "silent";
}

export function createAxiomLoggerStream(token: string, rawUrl?: string) {
    const targetUrl = resolveSafeAxiomUrl(rawUrl ?? process.env.AXIOM_URL);
    const buffer: Array<Record<string, unknown>> = [];
    let inFlightFlush: Promise<void> | null = null;
    let flushTimer: ReturnType<typeof setInterval> | null = null;

    const flushOnce = (): Promise<void> => {
        if (inFlightFlush) {
            return inFlightFlush;
        }
        if (buffer.length === 0) {
            return Promise.resolve();
        }
        const batch = buffer.splice(0, AXIOM_BATCH_SIZE);
        let currentRun: Promise<void> | null = null;
        const executeBatch = async () => {
            try {
                const response = await fetch(
                    `${targetUrl}/v1/datasets/${encodeURIComponent(axiomDataset)}/ingest`,
                    {
                        method: "POST",
                        headers: {
                            Authorization: `Bearer ${token}`,
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify(batch),
                        signal: AbortSignal.timeout(5000),
                    },
                );
                if (!response.ok) {
                    process.stderr.write(
                        `Axiom ingest warning: HTTP ${response.status}\n`,
                    );
                }
            } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                process.stderr.write(`Axiom ingest warning: ${msg}\n`);
            } finally {
                if (inFlightFlush === currentRun) {
                    inFlightFlush = null;
                }
            }
        };
        currentRun = executeBatch();
        inFlightFlush = currentRun;
        return currentRun;
    };

    const ensureTimer = () => {
        if (flushTimer) {
            return;
        }
        flushTimer = setInterval(() => {
            void flushOnce();
        }, AXIOM_FLUSH_INTERVAL_MS);
        flushTimer.unref();
    };

    return {
        stream: {
            write(chunk: string) {
                process.stdout.write(chunk);
                ensureTimer();
                const lines = chunk.split("\n");
                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed) continue;
                    try {
                        const parsed = JSON.parse(trimmed) as Record<string, unknown>;
                        const { time, level, ...rest } = parsed;
                        if (buffer.length >= MAX_AXIOM_BUFFER_SIZE) {
                            buffer.shift();
                        }
                        buffer.push({
                            _time: time,
                            level: mapPinoLevel(level),
                            ...rest,
                        });
                    } catch {
                        // Ignore non-JSON log lines for Axiom forwarding
                    }
                }
                if (buffer.length >= AXIOM_BATCH_SIZE) {
                    void flushOnce();
                }
            },
        },
        async flush() {
            if (flushTimer) {
                clearInterval(flushTimer);
                flushTimer = null;
            }
            if (inFlightFlush) {
                await inFlightFlush;
            }
            while (buffer.length > 0) {
                await flushOnce();
            }
        },
    };
}

const axiomDestination = axiomToken ? createAxiomLoggerStream(axiomToken) : null;

export async function flushLogger(): Promise<void> {
    if (axiomDestination) {
        await axiomDestination.flush();
    }
}

export const loggerConfig = {
    level: process.env.LOG_LEVEL ?? "info",
    redact: sharedRedact,
    transport: {
        target: "pino-pretty",
        options: {
            translateTime: "HH:MM:ss Z",
            ignore: "pid,hostname",
        },
    },
};

export const loggerProd = {
    level: process.env.LOG_LEVEL ?? "info",
    redact: sharedRedact,
    ...(axiomDestination ? { stream: axiomDestination.stream } : {}),
};

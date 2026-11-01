export const loggerConfig = {
    level: process.env.LOG_LEVEL ?? "info",
    redact: [
        "req.headers.authorization",
        "body.password",
        "body.cpf",
        "password",
        "token",
    ],
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
    redact: [
        "req.headers.authorization",
        "body.password",
        "body.cpf",
        "password",
        "token",
    ],
    transport: {
        target: "@axiomhq/pino",
        options: {
            dataset: process.env.AXIOM_DATASET ?? "backend-mei",
            token: process.env.AXIOM_TOKEN ?? process.env.LOGTOKEN,
        },
    },
};

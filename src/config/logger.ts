export const loggerConfig = {
    transport: {
        target: "pino-pretty",
        options: {
            translateTime: "HH:MM:ss Z",
            ignore: "pid,hostname",
        },
        redact: ["req.headers.authorization", "body.password", "body.cpf"],
    },
};

export const loggerProd = {
    level: "info",
    redact: ["req.headers.authorization", "body.password", "body.cpf"],
    transport: {
        target: "@axiomhq/pino",
        options: {
            dataset: "backend-mei",
            token: process.env.LOGTOKEN as string,
        },
    },
};

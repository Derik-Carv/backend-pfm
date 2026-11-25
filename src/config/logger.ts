const sharedRedact = [
    "req.headers.authorization",
    "req.headers.cookie",
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
];

const axiomToken = process.env.AXIOM_TOKEN ?? process.env.LOGTOKEN;

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
    ...(axiomToken
        ? {
              transport: {
                  target: "@axiomhq/pino",
                  options: {
                      dataset: process.env.AXIOM_DATASET ?? "backend-pfm",
                      token: axiomToken,
                  },
              },
          }
        : {}),
};

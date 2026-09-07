import type { FastifySchema } from "fastify";

export const loginSchema: FastifySchema = {
    description: "Route for login authentication",
    tags: ["Public"],
    body: {
        type: "object",
        required: ["username", "password"],
        properties: {
            username: { type: "string", description: "Username for login" },
            password: { type: "string", description: "Password for login" },
        },
    },
    response: {
        200: {
            description: "Successful login response",
            type: "object",
            properties: {
                message: { type: "string", description: "Success message" },
            },
        },
    },
};

export const healthSchema: FastifySchema = {
    description: "Check server health status",
    tags: ["Public"],
    response: {
        200: {
            description: "Successful check of server health status",
            type: "object",
            properties: {
                status: { type: "string" },
            },
        },
    },
};

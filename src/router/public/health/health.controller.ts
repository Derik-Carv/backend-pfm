import type { FastifyReply, FastifyRequest } from "fastify";
import { APP_VERSION } from "@/config/version";

export const healthController = async (
    request: FastifyRequest,
    reply: FastifyReply,
) => {
    return await { status: "ok", version: APP_VERSION };
};

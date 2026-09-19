import type { FastifyReply, FastifyRequest } from "fastify";

export function inspectRole(role: string) {
    return async (request: FastifyRequest, reply: FastifyReply) => {
        const userRole = request.user.role;
        if (userRole !== role) {
            return reply.status(403).send({
                message:
                    "Forbidden: You don't have permission to access this resource",
            });
        }
    };
}

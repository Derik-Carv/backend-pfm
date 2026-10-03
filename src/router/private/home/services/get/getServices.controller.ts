import type { FastifyRequest, FastifyReply } from "fastify";

export const getServicesController = async (
    request: FastifyRequest,
    reply: FastifyReply,
) => {
    try {
        // return reply.status(201).send({
        //     message: "Role register with sucess",
        //     role: newRole,
        // });
    } catch (error: any) {
        if (error.name === "ZodError") {
            return reply.status(400).send({
                message: "Validation error",
                issues: error.errors,
            });
        }

        return reply.status(500).send({
            message: "Internal server error while registering role",
        });
    }
};

import type { FastifyReply, FastifyRequest } from "fastify";
import { UsersRepository } from "@/database/tables/users/users.repository";
import { RoleRepository } from "@/database/tables/roles/roles.repository";

export async function authMiddleware(
    request: FastifyRequest,
    reply: FastifyReply,
) {
    try {
        await request.jwtVerify();
    } catch (error) {
        return reply.status(401).send({
            message: "Unauthorized: Invalid or expired token",
        });
    }

    const userRepository = new UsersRepository();
    const roleRepository = new RoleRepository();
    const user = await userRepository.findId(request.user.id);

    if (!user?.active) {
        return reply.status(401).send({
            message: "Unauthorized: User is inactive or does not exist",
        });
    }

    const role = await roleRepository.findById(user.roleId);

    if (!role?.active) {
        return reply.status(401).send({
            message: "Unauthorized: User role is inactive or does not exist",
        });
    }

    request.user.role = role.name;
    request.user.cpf = user.cpf;
}

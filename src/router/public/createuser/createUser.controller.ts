import type { FastifyRequest, FastifyReply } from "fastify";
import type { CreateUserInput } from "./user.schemas";
import { generateNick } from "@/utils/createNick";
import {
    createUserRepository,
    getCompareUsernameRepository,
} from "@/database/users/users.repository";
import { hashPassword } from "@/lib/hash";
import { cpfValidateNormal } from "@/utils/checkCpf";
import { getRoleForidRepository } from "@/database/users/roles.repository";

export const createUserController = async (
    request: FastifyRequest<{ Body: CreateUserInput }>,
    reply: FastifyReply,
) => {
    try {
        const { name, surname, username, password, cpf, roleId } = request.body;
        const serverCreateNick = await generateNick(name, surname);

        const serverValidNick =
            await getCompareUsernameRepository(serverCreateNick);
        const clientValidNick = await getCompareUsernameRepository(username);

        if (
            serverValidNick === clientValidNick ||
            (!clientValidNick && !serverValidNick)
        ) {
            const newPassword = await hashPassword(password);

            const validCpf = await cpfValidateNormal(cpf);

            if (validCpf) {
                const createdUser = {
                    name: name,
                    surname: surname,
                    username: serverCreateNick,
                    password: newPassword,
                    cpf: cpf,
                    roleId: roleId,
                };

                const newUser = await createUserRepository(createdUser);
                const roleName = await getRoleForidRepository(newUser.roleId);

                if (roleName) {
                    return reply.status(201).send({
                        message: "User registered successfully",
                        user: {
                            name: newUser.name,
                            surname: newUser.surname,
                            username: newUser.username,
                            role: roleName.name,
                            cpf: newUser.cpf,
                            createdAt: new Date(),
                        },
                    });
                }

                return reply.status(404).send({ message: "Role not found" });
            }

            return reply.status(404).send({ message: "Cpf invalid" });
        }

        return reply
            .status(404)
            .send({ message: "Username invalid or password invalid" });
    } catch (error) {
        request.log.error(error);
        return reply.status(500).send({
            message: "Internal server error while registering user",
        });
    }
};

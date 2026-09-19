import "@fastify/jwt";

declare module "@fastify/jwt" {
    interface FastifyJWT {
        payload: {
            id: string;
            role: string;
            cpf: string;
            acessNow: string;
        };
        user: {
            id: string;
            role: string;
            cpf: string;
            acessNow: string;
        };
    }
}

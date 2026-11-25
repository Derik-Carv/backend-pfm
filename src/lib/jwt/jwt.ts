import type { FastifyInstance, FastifyRequest } from "fastify";

export function jwtTokenGenerate(
    app: FastifyInstance,
    payload: { id: string; role: string },
): string {
    try {
        return app.jwt.sign(
            {
                id: payload.id,
                role: payload.role,
                acessNow: new Date().toISOString(),
            },
            {
                sub: payload.id,
                expiresIn: "30m",
            },
        );
    } catch (error) {
        throw new Error("JWT_GENERATION_ERROR");
    }
}

export async function jwtVeirfyTokeen(request: FastifyRequest) {
    try {
        await request.jwtVerify();
    } catch (error) {
        throw new Error("INVALID_OR_EXPIRED_TOKEN");
    }
}

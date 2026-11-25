import type { FastifyInstance, FastifyRequest } from "fastify";

export function jwtTokenGenerate(
    app: FastifyInstance,
    payload: { id: string; role: string; tokenVersion?: number },
): string {
    try {
        return app.jwt.sign(
            {
                id: payload.id,
                role: payload.role,
                tv: payload.tokenVersion ?? 1,
                acessNow: new Date().toISOString(),
            },
            {
                sub: payload.id,
                expiresIn: "30m",
                algorithm: "HS256",
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

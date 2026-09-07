import { app } from "@/app";

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "0.0.0.0";

(async () => {
    try {
        const address = await app.listen({ port: PORT, host: HOST });
        console.log(`🚀 Server is running on ${address}`);
    } catch (err) {
        app.log.error(err);
        process.exit(1);
    }
})();

import { startSeed } from "@/database/seed";

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "0.0.0.0";

(async () => {
    try {
        await startSeed();

        const { app } = await import("@/app");
        const address = await app.listen({ port: PORT, host: HOST });
        console.log(`🚀 Server is running on: ${address}`);
    } catch (err) {
        console.error("Failed to initialize the server.", err);
        process.exit(1);
    }
})();

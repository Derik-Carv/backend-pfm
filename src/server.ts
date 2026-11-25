import { startSeed } from "@/database/seed";
import { runLgpdRetentionCleanup } from "@/lib/lgpd/retention";

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "0.0.0.0";
const RETENTION_INTERVAL_MS = 12 * 60 * 60 * 1000;

(async () => {
    try {
        await startSeed();

        void runLgpdRetentionCleanup().catch((cleanupError) => {
            console.error("Failed initial LGPD retention cleanup:", cleanupError);
        });
        const cleanupTimer = setInterval(() => {
            void runLgpdRetentionCleanup().catch((cleanupError) => {
                console.error("Failed periodic LGPD retention cleanup:", cleanupError);
            });
        }, RETENTION_INTERVAL_MS);
        cleanupTimer.unref();

        const { app } = await import("@/app");
        const address = await app.listen({ port: PORT, host: HOST });
        console.log(`🚀 Server is running on: ${address}`);
    } catch (err) {
        console.error("Failed to initialize the server.", err);
        process.exit(1);
    }
})();

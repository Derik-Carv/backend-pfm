import { flushLogger } from "@/config/logger";
import { closeDatabase } from "@/database/index";
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

        let isShuttingDown = false;
        const shutdown = async (signal: string) => {
            if (isShuttingDown) {
                return;
            }
            isShuttingDown = true;

            const forceExit = setTimeout(() => {
                console.error(`Forced exit after ${signal} shutdown timeout.`);
                process.exit(1);
            }, 10_000);
            forceExit.unref();

            console.log(`Received ${signal}, shutting down gracefully...`);
            clearInterval(cleanupTimer);

            try {
                await app.close();
                await closeDatabase();
                await flushLogger();
                clearTimeout(forceExit);
                process.exit(0);
            } catch (shutdownErr) {
                console.error("Error during graceful shutdown:", shutdownErr);
                process.exit(1);
            }
        };

        process.on("SIGTERM", () => {
            void shutdown("SIGTERM");
        });
        process.on("SIGINT", () => {
            void shutdown("SIGINT");
        });
    } catch (err) {
        console.error("Failed to initialize the server.", err);
        process.exit(1);
    }
})();

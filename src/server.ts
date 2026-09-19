import { app } from "@/app";
import { startSeed } from "@/database/seed";
import { allRoles } from "./lib/roles.list";

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "0.0.0.0";

(async () => {
    try {
        const address = await app.listen({ port: PORT, host: HOST });
        console.log(`🚀 Server is running on: ${address}`);
        startSeed();
    } catch (err) {
        app.log.error(err);
        process.exit(1);
    }
})();

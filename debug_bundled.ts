import { db } from "./src/database/index";
import { bundled, users } from "./src/database/schema/schema";
import { like, eq } from "drizzle-orm";

const [derik] = await db.select().from(users).where(like(users.username, "%derik%")).limit(1);
const userBundles = await db.select().from(bundled).where(eq(bundled.userId, derik.id));

console.log("Total bundleds do derik:", userBundles.length);
console.log("\nClientIds guardados no bundled:");
userBundles.forEach(b => {
    console.log("  clientIdBundled:", b.clientIdBundled, "| serviceName:", b.serviceNameBundled);
});
process.exit(0);

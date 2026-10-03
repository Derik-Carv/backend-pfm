import { db } from "./src/database/index";
import { roles } from "./src/database/schema/schema";
import { eq } from "drizzle-orm";

const targetRoles = ["administrator", "manager", "finance", "observer", "colaborator"];

async function createRoles() {
    console.log("Criando as roles...");
    
    for (const roleName of targetRoles) {
        const existing = await db.select().from(roles).where(eq(roles.name, roleName));

        if (existing.length === 0) {
            await db.insert(roles).values({ name: roleName });
            console.log(`✅ Role '${roleName}' criada com sucesso.`);
        } else {
            console.log(`⚠️ Role '${roleName}' já existia no banco.`);
        }
    }
    process.exit(0);
}
createRoles().catch(console.error);

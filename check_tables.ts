import { db } from "./src/database/index";
import { roles, users, clients, type, statusService, services, nf, movimentation, bundled } from "./src/database/schema/schema";

async function checkTables() {
    const counts = await Promise.all([
        db.select().from(roles).then(r => ({ table: "roles", count: r.length, sample: r.slice(0,2).map(x => (x as any).name) })),
        db.select().from(users).then(r => ({ table: "users", count: r.length, sample: r.slice(0,2).map(x => (x as any).username) })),
        db.select().from(clients).then(r => ({ table: "clients", count: r.length, sample: r.slice(0,2).map(x => (x as any).tradeName) })),
        db.select().from(type).then(r => ({ table: "type", count: r.length, sample: r.slice(0,2).map(x => (x as any).name) })),
        db.select().from(statusService).then(r => ({ table: "statusService", count: r.length, sample: r.slice(0,3).map(x => (x as any).name) })),
        db.select().from(services).then(r => ({ table: "services", count: r.length, sample: r.slice(0,2).map(x => (x as any).serviceName) })),
        db.select().from(movimentation).then(r => ({ table: "movimentation", count: r.length, sample: [] })),
        db.select().from(nf).then(r => ({ table: "nf", count: r.length, sample: [] })),
        db.select().from(bundled).then(r => ({ table: "bundled", count: r.length, sample: [] })),
    ]);

    console.log("\n📊 ESTADO ATUAL DO BANCO:\n");
    for (const row of counts) {
        const status = row.count === 0 ? "❌ VAZIO" : `✅ ${row.count} registro(s)`;
        const samples = row.sample.length > 0 ? `→ [${row.sample.join(", ")}]` : "";
        console.log(`  ${status.padEnd(20)} | ${row.table.padEnd(20)} ${samples}`);
    }
    process.exit(0);
}
checkTables().catch(console.error);

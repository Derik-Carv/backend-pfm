import { db } from "./src/database/index";
import { users, services, bundled } from "./src/database/schema/schema";
import { like, eq } from "drizzle-orm";

async function populateBundled() {
    // 1. Buscar o usuário derik.carvalho
    const [user] = await db
        .select()
        .from(users)
        .where(like(users.username, "%derik%"))
        .limit(1);

    if (!user) {
        console.error("❌ Usuário 'derik.carvalho' não encontrado no banco!");
        process.exit(1);
    }

    console.log(`✅ Usuário encontrado: ${user.username} (${user.id})`);

    // 2. Buscar todos os serviços disponíveis
    const allServices = await db.select().from(services);

    if (allServices.length === 0) {
        console.error("❌ Nenhum serviço encontrado no banco!");
        process.exit(1);
    }

    console.log(`✅ ${allServices.length} serviço(s) encontrado(s).`);

    // 3. Verificar se já existem bundleds para esse usuário
    const existing = await db.select().from(bundled).where(eq(bundled.userId, user.id));
    if (existing.length > 0) {
        console.log(`⚠️ Usuário já possui ${existing.length} bundled(s). Pulando criação.`);
        process.exit(0);
    }

    // 4. Criar bundleds vinculando os serviços ao usuário
    const bundledsToInsert = allServices.map((service) => ({
        serviceBundledId: service.id,
        userId: user.id,
        serviceNameBundled: service.serviceName,
        priceBundled: service.price,
        clientIdBundled: service.clientId,
        initialDateBundled: service.initialDate ?? "2026-10-01",
        finishDateBundled: service.finishDate ?? null,
        active: true,
    }));

    const inserted = await db.insert(bundled).values(bundledsToInsert).returning();

    console.log(`\n✅ ${inserted.length} bundled(s) criado(s) com sucesso para o usuário ${user.username}:`);
    for (const b of inserted) {
        console.log(`   - Serviço: ${b.serviceNameBundled} | Preço: R$ ${b.priceBundled}`);
    }

    process.exit(0);
}

populateBundled().catch(console.error);

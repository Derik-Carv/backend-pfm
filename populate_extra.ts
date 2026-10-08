import { db } from "./src/database/index";
import { users, clients, movimentation, nf, services, bundled, roles, type, statusService } from "./src/database/schema/schema";
import { eq, like } from "drizzle-orm";
import { hashPassword } from "./src/lib/hash";

async function populate() {
    console.log("🌱 Iniciando seed extra...\n");

    // Buscar roles existentes
    const allRoles = await db.select().from(roles);
    const roleMap = Object.fromEntries(allRoles.map(r => [r.name, r.id]));
    console.log("Roles encontradas:", Object.keys(roleMap).join(", "));

    const allTypes = await db.select().from(type);
    const allStatuses = await db.select().from(statusService);

    const pwd = await hashPassword("Senha@123");

    // ─── USUÁRIOS ──────────────────────────────────────────────
    console.log("\n👤 Criando usuários...");
    const newUsers = await db.insert(users).values([
        { name: "Ana", surname: "Lima", username: "ana.lima", roleId: roleMap["manager"], cpf: "55566677788", active: true, password: pwd },
        { name: "Paulo", surname: "Rocha", username: "paulo.rocha", roleId: roleMap["finance"], cpf: "99988877766", active: true, password: pwd },
        { name: "Julia", surname: "Neves", username: "julia.neves", roleId: roleMap["observer"], cpf: "11122233344", active: true, password: pwd },
        { name: "Marcos", surname: "Costa", username: "marcos.costa", roleId: roleMap["colaborator"], cpf: "44433322211", active: true, password: pwd },
    ]).returning();
    console.log(`✅ ${newUsers.length} usuários criados.`);

    // ─── CLIENTS ──────────────────────────────────────────────
    console.log("\n🏢 Criando clientes...");
    const newClients = await db.insert(clients).values([
        { registeredCompanyName: "Infraestrutura Digital Ltda", tradeName: "InfraDigital", cnpj: "33344455000199", active: true },
        { registeredCompanyName: "Consultoria Prime S/A", tradeName: "Prime Consult", cnpj: "77788899000111", active: true },
        { registeredCompanyName: "Fernanda Ribeiro", tradeName: "Fernanda Dev", cpf: "66655544433", active: true },
    ]).returning();
    console.log(`✅ ${newClients.length} clientes criados.`);

    // ─── SERVICES ──────────────────────────────────────────────
    console.log("\n🔧 Criando serviços...");
    const newServices = await db.insert(services).values([
        { serviceName: "Migração para Nuvem", price: "12000.00", initialDate: "2026-10-01", finishDate: "2026-12-01", clientId: newClients[0].id, details: "Migração completa de infraestrutura para AWS", statusServiceId: allStatuses[0].id, active: true },
        { serviceName: "Treinamento de Equipe TI", price: "3500.00", initialDate: "2026-10-10", finishDate: "2026-10-20", clientId: newClients[1].id, details: "Capacitação em boas práticas de desenvolvimento", statusServiceId: allStatuses[1].id, active: true },
        { serviceName: "Design de UI/UX", price: "2200.00", initialDate: "2026-11-01", finishDate: "2026-11-15", clientId: newClients[2].id, details: "Redesign completo da interface mobile", statusServiceId: allStatuses[0].id, active: true },
    ]).returning();
    console.log(`✅ ${newServices.length} serviços criados.`);

    // ─── MOVIMENTATION ──────────────────────────────────────────
    console.log("\n📦 Criando movimentações...");
    const newMovimentations = await db.insert(movimentation).values([
        { name: "Entrega de Equipamento", destinationUserId: newUsers[0].id, destinationClientId: newClients[0].id, justify: "Entrega de notebook para início do projeto de migração", active: true },
        { name: "Visita Técnica", destinationUserId: newUsers[1].id, destinationClientId: newClients[1].id, justify: "Levantamento de requisitos para treinamento", active: true },
        { name: "Revisão de Contrato", destinationUserId: newUsers[2].id, destinationClientId: newClients[2].id, justify: "Revisão e assinatura do contrato de design", active: true },
    ]).returning();
    console.log(`✅ ${newMovimentations.length} movimentações criadas.`);

    // ─── NF ─────────────────────────────────────────────────────
    console.log("\n🧾 Criando notas fiscais...");
    const newNfs = await db.insert(nf).values([
        { typeId: allTypes[0].id, numberNf: "2001", acessKey: "42345678901234567890123456789012345678901234", thirdPartyClientId: newClients[0].id, emissionDate: "2026-10-01", cancelDate: "2026-10-01", totalValue: "12000.00", servicesId: newServices[0].id, movimentationId: newMovimentations[0].id, active: true },
        { typeId: allTypes[1].id, numberNf: "2002", acessKey: "52345678901234567890123456789012345678901234", thirdPartyClientId: newClients[1].id, emissionDate: "2026-10-10", cancelDate: "2026-10-10", totalValue: "3500.00", servicesId: newServices[1].id, movimentationId: newMovimentations[1].id, active: true },
        { typeId: allTypes[0].id, numberNf: "2003", acessKey: "62345678901234567890123456789012345678901234", thirdPartyClientId: newClients[2].id, emissionDate: "2026-11-01", cancelDate: "2026-11-01", totalValue: "2200.00", servicesId: newServices[2].id, movimentationId: newMovimentations[2].id, active: true },
    ]).returning();
    console.log(`✅ ${newNfs.length} notas fiscais criadas.`);

    // ─── BUNDLED (derik.carvalho + novos serviços) ──────────────
    console.log("\n📎 Vinculando novos serviços ao derik.carvalho...");
    const [derik] = await db.select().from(users).where(like(users.username, "%derik%")).limit(1);
    if (derik) {
        await db.insert(bundled).values(
            newServices.map(s => ({
                serviceBundledId: s.id,
                userId: derik.id,
                serviceNameBundled: s.serviceName,
                priceBundled: s.price,
                clientIdBundled: s.clientId,
                initialDateBundled: s.initialDate ?? "2026-10-01",
                finishDateBundled: s.finishDate ?? null,
                active: true,
            }))
        );
        console.log(`✅ ${newServices.length} bundleds adicionados para ${derik.username}.`);
    }

    console.log("\n🎉 Seed extra finalizado com sucesso!");
    process.exit(0);
}

populate().catch(console.error);

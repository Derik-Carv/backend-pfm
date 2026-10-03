import { db } from "./src/database/index";
import { roles, users, clients, type, statusService, movimentation, services, nf } from "./src/database/schema/schema";
import { hashPassword } from "./src/lib/hash";

async function populate() {
    console.log("🌱 Iniciando o seed de 3 itens por tabela...");

    // 1. ROLES
    console.log("Populating Roles...");
    const insertedRoles = await db.insert(roles).values([
        { name: "manager_" + Date.now(), active: true },
        { name: "employee_" + Date.now(), active: true },
        { name: "guest_" + Date.now(), active: true },
    ]).returning();

    // 2. USERS
    console.log("Populating Users...");
    const pwd = await hashPassword("123456");
    const insertedUsers = await db.insert(users).values([
        { name: "Alice", surname: "Silva", username: "alice." + Date.now(), roleId: insertedRoles[0].id, cpf: "11111111111", active: true, password: pwd },
        { name: "Bob", surname: "Souza", username: "bob." + Date.now(), roleId: insertedRoles[1].id, cpf: "22222222222", active: true, password: pwd },
        { name: "Carlos", surname: "Santos", username: "carlos." + Date.now(), roleId: insertedRoles[2].id, cpf: "33333333333", active: true, password: pwd },
    ]).returning();

    // 3. CLIENTS
    console.log("Populating Clients...");
    const insertedClients = await db.insert(clients).values([
        { registeredCompanyName: "Empresa A " + Date.now(), tradeName: "Fantasia A " + Date.now(), cnpj: "11111111000111", active: true },
        { registeredCompanyName: "Empresa B " + Date.now(), tradeName: "Fantasia B " + Date.now(), cnpj: "22222222000122", active: true },
        { registeredCompanyName: "Cliente C " + Date.now(), tradeName: "Fantasia C " + Date.now(), cpf: "44444444444", active: true },
    ]).returning();

    // 4. TYPE (e.g. types of NF or Movimentation)
    console.log("Populating Types...");
    const insertedTypes = await db.insert(type).values([
        { name: "Venda de Produto", active: true },
        { name: "Prestação de Serviço", active: true },
        { name: "Devolução", active: true },
    ]).returning();

    // 5. STATUS SERVICE
    console.log("Populating Status Service...");
    const insertedStatuses = await db.insert(statusService).values([
        { name: "Pendente", active: true },
        { name: "Em Andamento", active: true },
        { name: "Concluído", active: true },
    ]).returning();

    // 6. MOVIMENTATION
    console.log("Populating Movimentation...");
    const insertedMovimentations = await db.insert(movimentation).values([
        { name: "Movimentação 1", destinationUserId: insertedUsers[0].id, destinationClientId: insertedClients[0].id, justify: "Justificativa A", active: true },
        { name: "Movimentação 2", destinationUserId: insertedUsers[1].id, destinationClientId: insertedClients[1].id, justify: "Justificativa B", active: true },
        { name: "Movimentação 3", destinationUserId: insertedUsers[2].id, destinationClientId: insertedClients[2].id, justify: "Justificativa C", active: true },
    ]).returning();

    // 7. SERVICES
    console.log("Populating Services...");
    const insertedServices = await db.insert(services).values([
        { serviceName: "Manutenção Preventiva", price: "150.00", initialDate: "2026-10-01", finishDate: "2026-10-05", clientId: insertedClients[0].id, details: "Detalhes A", statusServiceId: insertedStatuses[0].id, active: true },
        { serviceName: "Consultoria TI", price: "3000.00", initialDate: "2026-10-02", finishDate: "2026-10-10", clientId: insertedClients[1].id, details: "Detalhes B", statusServiceId: insertedStatuses[1].id, active: true },
        { serviceName: "Instalação de Rede", price: "500.50", initialDate: "2026-10-03", finishDate: "2026-10-04", clientId: insertedClients[2].id, details: "Detalhes C", statusServiceId: insertedStatuses[2].id, active: true },
    ]).returning();

    // 8. NF
    console.log("Populating NF...");
    const insertedNfs = await db.insert(nf).values([
        { typeId: insertedTypes[0].id, numberNf: "1001", acessKey: "12345678901234567890123456789012345678901234", thirdPartyClientId: insertedClients[0].id, emissionDate: "2026-10-01", cancelDate: "2026-10-01", totalValue: "150.00", servicesId: insertedServices[0].id, movimentationId: insertedMovimentations[0].id, active: true },
        { typeId: insertedTypes[1].id, numberNf: "1002", acessKey: "22345678901234567890123456789012345678901234", thirdPartyClientId: insertedClients[1].id, emissionDate: "2026-10-02", cancelDate: "2026-10-02", totalValue: "3000.00", servicesId: insertedServices[1].id, movimentationId: insertedMovimentations[1].id, active: true },
        { typeId: insertedTypes[2].id, numberNf: "1003", acessKey: "32345678901234567890123456789012345678901234", thirdPartyClientId: insertedClients[2].id, emissionDate: "2026-10-03", cancelDate: "2026-10-03", totalValue: "500.50", servicesId: insertedServices[2].id, movimentationId: insertedMovimentations[2].id, active: true },
    ]).returning();

    console.log("✅ Seed finalizado com sucesso! 3 itens criados em cada tabela.");
    process.exit(0);
}

populate().catch(console.error);

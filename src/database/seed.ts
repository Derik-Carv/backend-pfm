import { db } from "@/database/index";
import {
    clients,
    statusService,
    type,
    services,
    movimentation,
    nf,
} from "@/database/schema/schema";
import { RoleRepository } from "@/database/tables/roles/roles.repository";
import { UsersRepository } from "@/database/tables/users/users.repository";
import { cpfClean } from "@/utils/checkCpf";
import { hashPassword } from "@/lib/hash";

export async function startSeed() {
    const roleRepo = new RoleRepository();
    const userRepository = new UsersRepository();

    // 1. DADOS BASE DO SISTEMA (ROLES)
    const adminRoleName = "administrator";
    const colaboratorRoleName = "colaborator";
    const managerRoleName = "manager";
    const financeRoleName = "finance";
    const observerRoleName = "observer";

    let adminRole = await roleRepo.findByName(adminRoleName);
    let colaboratorRole = await roleRepo.findByName(colaboratorRoleName);
    let managerRole = await roleRepo.findByName(managerRoleName);
    let financeRole = await roleRepo.findByName(financeRoleName);
    let observerRole = await roleRepo.findByName(observerRoleName);

    if (!adminRole) adminRole = await roleRepo.create({ name: adminRoleName });
    if (!colaboratorRole)
        colaboratorRole = await roleRepo.create({ name: colaboratorRoleName });
    if (!managerRole)
        managerRole = await roleRepo.create({ name: managerRoleName });
    if (!financeRole)
        financeRole = await roleRepo.create({ name: financeRoleName });
    if (!observerRole)
        observerRole = await roleRepo.create({ name: observerRoleName });

    const adminName = "administrator";
    const adminSurname = "system";
    const adminUsername = "administrator.system";
    const cpf = await cpfClean(process.env.CPFADMIN as string);
    const rawPassword = process.env.ADMIN_DEFAULT_PASSWORD as string;

    const existingUser = await userRepository.findUsername(adminUsername);

    if (existingUser) {
        console.log("admin user already exists");
    } else {
        console.log("👤 Criando usuário admin padrão...");
        const hashedPassword = await hashPassword(rawPassword);

        const data = {
            name: adminName,
            surname: adminSurname,
            username: adminUsername,
            password: hashedPassword,
            roleId: adminRole.id,
            cpf: cpf,
            active: true,
        };

        await userRepository.create(data);
        console.log("admin user created with success");
    }

    if (process.env.NODE_ENV !== "development") {
        console.log(
            "⚠️ Ambiente não é 'development'. Ignorando a inserção de dados fictícios.",
        );
        return;
    }

    console.log("🌱 Iniciando o seed de dados complementares...");

    const existingClients = await db.select().from(clients).limit(1);

    if (existingClients.length > 0) {
        console.log(
            "⚠️ Dados fictícios já constam no banco. Seed complementar ignorado.",
        );
        return;
    }

    try {
        console.log("-> Populando Clientes...");
        const insertedClients = await db
            .insert(clients)
            .values([
                {
                    registeredCompanyName: "Tech Solutions Portugal S.A.",
                    tradeName: "Tech Solutions",
                    cnpj: "12345678000199",
                },
                {
                    registeredCompanyName: "Comércio Global LTDA",
                    tradeName: "Global Market",
                    cnpj: "98765432000188",
                },
            ])
            .returning({ id: clients.id });

        console.log("-> Populando Status de Serviços...");
        const insertedStatus = await db
            .insert(statusService)
            .values([
                { name: "Fila" },
                { name: "Em Andamento" },
                { name: "Finalizado" },
            ])
            .returning({ id: statusService.id });

        console.log("-> Populando Tipos (Entrada/Saída)...");
        const insertedTypes = await db
            .insert(type)
            .values([
                { name: "Serviço Prestado" },
                { name: "Aquisição de Material" },
            ])
            .returning({ id: type.id });

        console.log("-> Populando Serviços...");
        const insertedServices = await db
            .insert(services)
            .values([
                {
                    serviceName: "Auditoria de Segurança (Rede)",
                    price: "4500.00",
                    initialDate: "2026-10-10",
                    finishDate: "2026-10-15",
                    clientId: insertedClients[0].id,
                    details:
                        "Análise de vulnerabilidades na infraestrutura e firewall.",
                    statusServiceId: insertedStatus[1].id,
                },
                {
                    serviceName: "Desenvolvimento de API REST",
                    price: "8500.50",
                    initialDate: "2026-11-01",
                    finishDate: "2026-12-10",
                    clientId: insertedClients[1].id,
                    details:
                        "Criação de backend escalável usando Node e Fastify.",
                    statusServiceId: insertedStatus[0].id,
                },
            ])
            .returning({ id: services.id });

        console.log("-> Populando Movimentações...");
        const insertedMovs = await db
            .insert(movimentation)
            .values([
                {
                    name: "Adiantamento - Auditoria",
                    destinationClientId: insertedClients[0].id,
                    justify:
                        "Pagamento de 50% inicial referente à auditoria de rede.",
                },
            ])
            .returning({ id: movimentation.id });

        console.log("-> Populando Notas Fiscais (NFs)...");
        await db.insert(nf).values([
            {
                typeId: insertedTypes[0].id,
                numberNf: "00012345",
                thirdPartyClientId: insertedClients[0].id,
                emissionDate: "2026-10-11",
                cancelDate: "2026-12-31",
                totalValue: "2250.00",
                servicesId: insertedServices[0].id,
                movimentationId: insertedMovs[0].id,
            },
        ]);

        console.log("✅ Dados fictícios inseridos com sucesso!");
    } catch (error) {
        console.error("❌ Erro ao inserir dados fictícios:");
        console.error(error);
    }
}

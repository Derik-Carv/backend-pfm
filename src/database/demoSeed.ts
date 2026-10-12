import { createHash } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/database/index";
import {
    bundled,
    clients,
    movimentation,
    nf,
    services,
    statusService,
    type as invoiceType,
    users,
} from "@/database/schema/schema";
import { hashPassword } from "@/lib/hash";

const CLIENT_COUNT = 250;
const USER_COUNT = 20;
const SERVICE_COUNT = 5_000;
const INVOICE_COUNT = 1_000;
const INSERT_BATCH_SIZE = 250;
const DEMO_PASSWORD = process.env.DEMO_SEED_PASSWORD ?? "Demo@123456";

function stableId(entity: string, index: number): string {
    const bytes = createHash("sha256")
        .update(`backend-pfm-demo:${entity}:${index}`)
        .digest()
        .subarray(0, 16);

    bytes[6] = (bytes[6] & 0x0f) | 0x50;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    const hex = bytes.toString("hex");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function dateOffset(daysAgo: number): string {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - daysAgo);
    return date.toISOString().slice(0, 10);
}

async function insertInBatches<T>(
    rows: T[],
    insertBatch: (batch: T[]) => Promise<unknown>,
) {
    for (let start = 0; start < rows.length; start += INSERT_BATCH_SIZE) {
        await insertBatch(rows.slice(start, start + INSERT_BATCH_SIZE));
    }
}

export async function seedDemoData(roleMap: Record<string, string>) {
    const clientRows = Array.from({ length: CLIENT_COUNT }, (_, index) => {
        const number = index + 1;
        const tradeName = `Cliente Demonstração ${String(number).padStart(3, "0")}`;
        return {
            id: stableId("client", number),
            registeredCompanyName: `${tradeName} LTDA`,
            tradeName,
            active: number % 10 !== 0,
        };
    });
    const userRows = Array.from({ length: USER_COUNT }, (_, index) => {
        const number = index + 1;
        return {
            id: stableId("user", number),
            name: `Colaborador ${String(number).padStart(2, "0")}`,
            surname: "Demonstração",
            username: `demo.colaborator.${String(number).padStart(2, "0")}`,
            cpf: String(90_000_000_000 + number),
            roleId: roleMap.colaborator,
            active: number % 10 !== 0,
        };
    });
    const [statusRows, typeRows, existingDemoUsers] = await Promise.all([
        db.select().from(statusService).where(
            inArray(
                statusService.name,
                ["Fila", "Em Andamento", "Finalizado"],
            ),
        ),
        db
            .select()
            .from(invoiceType)
            .where(eq(invoiceType.name, "Serviço Prestado")),
        db
            .select({ username: users.username })
            .from(users)
            .where(inArray(users.username, userRows.map((user) => user.username))),
    ]);

    await insertInBatches(clientRows, async (batch) => {
        await db.insert(clients).values(batch).onConflictDoNothing();
    });
    const existingUsernames = new Set(
        existingDemoUsers.map((user) => user.username),
    );
    const usersToInsert = userRows.filter(
        (user) => !existingUsernames.has(user.username),
    );
    if (usersToInsert.length > 0) {
        const password = await hashPassword(DEMO_PASSWORD);
        await insertInBatches(
            usersToInsert.map((user) => ({ ...user, password })),
            async (batch) => {
                await db.insert(users).values(batch).onConflictDoNothing();
            },
        );
    }

    const [savedClients, savedUsers] = await Promise.all([
        db
            .select()
            .from(clients)
            .where(
                inArray(
                    clients.tradeName,
                    clientRows.map((client) => client.tradeName),
                ),
            ),
        db
            .select()
            .from(users)
            .where(
                inArray(
                    users.username,
                    userRows.map((user) => user.username),
                ),
            ),
    ]);

    const statusIds = new Map(statusRows.map((status) => [status.name, status.id]));
    const filaStatusId = statusIds.get("Fila");
    const inProgressStatusId = statusIds.get("Em Andamento");
    const completedStatusId = statusIds.get("Finalizado");
    const invoiceTypeId = typeRows[0]?.id;
    if (
        savedClients.length !== CLIENT_COUNT ||
        savedUsers.length !== USER_COUNT ||
        !filaStatusId ||
        !inProgressStatusId ||
        !completedStatusId ||
        !invoiceTypeId ||
        !roleMap.colaborator
    ) {
        throw new Error("DEMO_SEED_PREREQUISITES_MISSING");
    }

    const usersByUsername = new Map(
        savedUsers.map((user) => [user.username, user]),
    );
    const serviceRows = Array.from({ length: SERVICE_COUNT }, (_, index) => {
        const number = index + 1;
        const client = savedClients[index % savedClients.length];
        const initialDate = dateOffset(index % 730);
        const finishDate =
            index % 4 === 0 ? null : dateOffset(Math.max(0, (index % 730) - 14));

        return {
            id: stableId("service", number),
            serviceName: `Serviço de demonstração ${String(number).padStart(5, "0")}`,
            price: (150 + ((number * 137) % 20_000)).toFixed(2),
            initialDate,
            finishDate,
            clientId: client.id,
            details: `Descrição fictícia para testar o serviço ${number}.`,
            statusServiceId: [
                filaStatusId,
                inProgressStatusId,
                completedStatusId,
            ][index % 3],
            active: number % 12 !== 0,
        };
    });

    await insertInBatches(serviceRows, async (batch) => {
        await db.insert(services).values(batch).onConflictDoNothing();
    });

    const bundleRows = serviceRows.map((service, index) => {
        const number = index + 1;
        const userNumber = (index % USER_COUNT) + 1;
        const client = savedClients[index % savedClients.length];
        const user = usersByUsername.get(
            `demo.colaborator.${String(userNumber).padStart(2, "0")}`,
        );
        if (!user) {
            throw new Error("DEMO_SEED_USER_NOT_FOUND");
        }

        return {
            id: stableId("bundle", number),
            serviceBundledId: service.id,
            userId: user.id,
            serviceNameBundled: service.serviceName,
            priceBundled: service.price,
            clientIdBundled: client.id,
            initialDateBundled: service.initialDate,
            finishDateBundled: service.finishDate,
            active: service.active,
        };
    });

    await insertInBatches(bundleRows, async (batch) => {
        await db.insert(bundled).values(batch).onConflictDoNothing();
    });

    const invoiceServices = serviceRows.filter((_, index) => index % 5 === 0);
    const movementRows = invoiceServices
        .slice(0, INVOICE_COUNT)
        .map((_, index) => {
            const number = index + 1;
            const client = savedClients[index % savedClients.length];
            const user = savedUsers[index % savedUsers.length];

            return {
                id: stableId("movement", number),
                name: `Movimentação de demonstração ${String(number).padStart(4, "0")}`,
                nfId: stableId("invoice", number),
                destinationUserId: user.id,
                destinationClientId: client.id,
                justify: `Justificativa fictícia para a movimentação ${number}.`,
                active: number % 15 !== 0,
            };
        });

    await insertInBatches(movementRows, async (batch) => {
        await db.insert(movimentation).values(batch).onConflictDoNothing();
    });

    const invoiceRows = invoiceServices
        .slice(0, INVOICE_COUNT)
        .map((service, index) => {
            const number = index + 1;
            const client = savedClients[index % savedClients.length];

            return {
                id: stableId("invoice", number),
                typeId: invoiceTypeId,
                numberNf: `DEMO-${String(number).padStart(6, "0")}`,
                acessKey: String(90_000_000_000 + number).padStart(44, "0"),
                thirdPartyClientId: client.id,
                emissionDate: service.initialDate,
                cancelDate: service.finishDate ?? service.initialDate,
                totalValue: service.price,
                pathFile: null,
                servicesId: service.id,
                movimentationId: stableId("movement", number),
                active: number % 15 !== 0,
            };
        });

    await insertInBatches(invoiceRows, async (batch) => {
        await db.insert(nf).values(batch).onConflictDoNothing();
    });

    console.log(
        `✅ Dados de demonstração verificados: ${CLIENT_COUNT} clientes, ${USER_COUNT} usuários, ${SERVICE_COUNT} serviços e ${INVOICE_COUNT} notas/movimentações.`,
    );
}

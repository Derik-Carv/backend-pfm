import { db } from "./src/database/index";
import { type, clients, services, movimentation } from "./src/database/schema/schema";

const [types, cls, svcs, movs] = await Promise.all([
    db.select({ id: type.id, name: type.name }).from(type).limit(1),
    db.select({ id: clients.id, name: clients.tradeName }).from(clients).limit(1),
    db.select({ id: services.id, name: services.serviceName }).from(services).limit(1),
    db.select({ id: movimentation.id, name: movimentation.name }).from(movimentation).limit(1),
]);

console.log("typeId:", types[0].id, "->", types[0].name);
console.log("thirdPartyClientId:", cls[0].id, "->", cls[0].name);
console.log("servicesId:", svcs[0].id, "->", svcs[0].name);
console.log("movimentationId:", movs[0].id, "->", movs[0].name);
process.exit(0);

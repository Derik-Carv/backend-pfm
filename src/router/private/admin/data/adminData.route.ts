import type { FastifyInstance } from "fastify";
import { adminCreateOptions, adminDetailOptions, adminListOptions, adminUpdateOptions } from "./adminData.options";
import {
    createAdminRecordController,
    findAdminRecordController,
    listAdminRecordsController,
    updateAdminRecordController,
} from "./adminData.controller";

export async function adminDataRoutes(app: FastifyInstance) {
    app.get("/:table", adminListOptions, listAdminRecordsController);
    app.get("/:table/:id", adminDetailOptions, findAdminRecordController);
    app.post("/:table", adminCreateOptions, createAdminRecordController);
    app.patch("/:table/:id", adminUpdateOptions, updateAdminRecordController);
}

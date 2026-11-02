import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { NfRepository } from "@/database/tables/nf/nf.repository";
import { TypeRepository } from "@/database/tables/type/type.repository,";
import { updateNfPdf, validateNfPdf } from "../create/createNf.pdf";

const paramsSchema = z.object({ id: z.string().uuid() });
const nfRepository = new NfRepository();
const typeRepository = new TypeRepository();

export async function replaceNfFileController(
    request: FastifyRequest,
    reply: FastifyReply,
) {
    try {
        const { id } = paramsSchema.parse(request.params);
        const note = await nfRepository.findId(id);
        if (!note) return reply.status(404).send({ message: "Fiscal note not found" });

        let file: File | undefined;
        for await (const part of request.parts()) {
            if (part.type === "file" && part.fieldname === "file") {
                file = new File([await part.toBuffer()], part.filename, {
                    type: part.mimetype,
                });
            }
        }

        if (!file) return reply.status(400).send({ message: "PDF file is required" });
        if (file.type !== "application/pdf" || file.size === 0) {
            return reply.status(400).send({ message: "A non-empty PDF file is required" });
        }

        const type = await typeRepository.findId(note.typeId);
        if (!type) return reply.status(404).send({ message: "NF type not found" });

        await validateNfPdf(file, {
            typeId: note.typeId,
            numberNf: note.numberNf ?? "",
            acessKey: note.acessKey ?? "",
            thirdPartyClientId: note.thirdPartyClientId,
            emissionDate: note.emissionDate,
            totalValue: Number(note.totalValue),
            servicesId: note.servicesId,
            movimentationId: note.movimentationId,
        });

        const pathFile = await updateNfPdf(file, type.name);
        const updated = await nfRepository.updatePathFile(id, pathFile);
        if (!updated) return reply.status(404).send({ message: "Fiscal note not found" });

        return reply.status(200).send({
            message: "Fiscal note PDF attached successfully",
            note: updated,
        });
    } catch (error) {
        request.log.error({ err: error }, "Error while replacing NF file");
        if (error instanceof z.ZodError) {
            return reply.status(400).send({ message: "Invalid fiscal note id" });
        }
        if (error instanceof Error && error.message === "PDF_TEXT_NOT_FOUND") {
            return reply.status(400).send({ message: "The PDF has no selectable text" });
        }
        if (error instanceof Error && error.message === "NF_PDF_INCONSISTENT") {
            return reply.status(400).send({ message: "PDF data does not match the fiscal note" });
        }
        return reply.status(400).send({ message: "The PDF could not be validated" });
    }
}

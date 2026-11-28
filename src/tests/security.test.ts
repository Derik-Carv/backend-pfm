import { describe, expect, it } from "bun:test";
import path from "node:path";
import {
    ARCHIVE_ROOT,
    buildSafeNfArchivePath,
    resolveSafeArchivePath,
} from "@/lib/archivePath";
import { sanitizeLegalControllerDocument } from "@/lib/lgpd/legal.constants";
import { escapeHtml, sanitizeHeaderValue } from "@/lib/nodemailer/nodemailer";
import { hasTenantAccess, isValidUuid } from "@/lib/tenant";
import { assertValidPdfBuffer } from "@/router/private/NF/create/createNf.pdf";
import { nfCreateBaseSchema } from "@/router/private/NF/nf.schemas";
import { createCompanyUserBodySchema } from "@/router/private/companies/companies.schemas";
import { serviceCreateBaseSchema } from "@/router/private/service/myServicesList.schemas";
import { createTypeSchema } from "@/router/private/type/type.schemas";
import { loginSchema } from "@/router/public/login/login.schemas";
import { cpfClean, cpfValidateNormal } from "@/utils/checkCpf";

const VALID_COMPANY_UUID = "0194851b-55c1-7000-8000-000000000001";
const OTHER_COMPANY_UUID = "0194851b-55c1-7000-8000-000000000002";

describe("Tenant Isolation & UUID Helpers", () => {
    it("validates UUIDs strictly", () => {
        expect(isValidUuid(VALID_COMPANY_UUID)).toBe(true);
        expect(isValidUuid("not-a-uuid")).toBe(false);
        expect(isValidUuid("")).toBe(false);
        expect(isValidUuid(null)).toBe(false);
    });

    it("fails closed on empty/undefined accessibleCompanyIds or null companyId", () => {
        expect(hasTenantAccess(VALID_COMPANY_UUID, undefined)).toBe(false);
        expect(hasTenantAccess(VALID_COMPANY_UUID, [])).toBe(false);
        expect(hasTenantAccess(null, [VALID_COMPANY_UUID])).toBe(false);
        expect(hasTenantAccess(OTHER_COMPANY_UUID, [VALID_COMPANY_UUID])).toBe(false);
        expect(hasTenantAccess(VALID_COMPANY_UUID, [VALID_COMPANY_UUID])).toBe(true);
    });
});

describe("Archive Path Traversal Protection", () => {
    it("rejects traversal and paths outside archives/", () => {
        expect(() => resolveSafeArchivePath("")).toThrow();
        expect(() => resolveSafeArchivePath("../.env")).toThrow();
        expect(() => resolveSafeArchivePath("archives/../../etc/passwd")).toThrow();
        expect(() => resolveSafeArchivePath("/etc/passwd")).toThrow();

        const valid = resolveSafeArchivePath("archives/test/note.pdf");
        expect(valid.startsWith(`${ARCHIVE_ROOT}${path.sep}`)).toBe(true);
    });

    it("builds tenant-scoped NF paths safely even for malicious typeName", () => {
        expect(() =>
            buildSafeNfArchivePath("invalid-company", "Serviço", "1234"),
        ).toThrow();

        const built = buildSafeNfArchivePath(
            VALID_COMPANY_UUID,
            "../../etc",
            "12345678901234567890123456789012345678901234",
        );
        expect(built.absolutePath.startsWith(`${ARCHIVE_ROOT}${path.sep}`)).toBe(true);
        expect(built.relativePath).toContain(VALID_COMPANY_UUID);
        expect(built.relativePath).not.toContain("..");
    });
});

describe("Email HTML & Header Injection Protection", () => {
    it("escapes HTML tags and quotes", () => {
        const escaped = escapeHtml(`<script>alert("xss")</script> & 'test'`);
        expect(escaped).toBe(
            "&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt; &amp; &#39;test&#39;",
        );
    });

    it("strips CR/LF/NUL from email headers", () => {
        const clean = sanitizeHeaderValue('Empresa\r\nBcc: evil@attacker.com"Test', true);
        expect(clean).not.toContain("\r");
        expect(clean).not.toContain("\n");
        expect(clean).not.toContain('"');
    });
});

describe("PDF Magic-Byte & Size Validation", () => {
    it("rejects empty, oversized, or non-PDF buffers", () => {
        expect(() => assertValidPdfBuffer(Buffer.alloc(0))).toThrow("EMPTY_FILE");
        expect(() => assertValidPdfBuffer(Buffer.from("<html>fake</html>"))).toThrow(
            "INVALID_FILE_TYPE",
        );
        expect(() =>
            assertValidPdfBuffer(Buffer.alloc(10 * 1024 * 1024 + 1, 0x25)),
        ).toThrow("PDF_FILE_TOO_LARGE");
        expect(() =>
            assertValidPdfBuffer(Buffer.from("%PDF-1.7\n%valid")),
        ).not.toThrow();
    });
});

describe("CPF Cleaning & Validation", () => {
    it("strips non-digits and validates check digits", async () => {
        expect(cpfClean("123.456.789-00abc_")).toBe("12345678900");
        expect(await cpfValidateNormal("111.111.111-11")).toBe(false);
        expect(await cpfValidateNormal("12345678900")).toBe(false);
        expect(await cpfValidateNormal("529.982.247-25")).toBe(true);
    });
});

describe("Critical Input Schemas", () => {
    it("rejects path separators and dots in type names", () => {
        expect(createTypeSchema.safeParse({ name: ".." }).success).toBe(false);
        expect(createTypeSchema.safeParse({ name: "../evil" }).success).toBe(false);
        expect(createTypeSchema.safeParse({ name: "Serviço Prestado" }).success).toBe(true);
    });

    it("strips disallowed mass-assignment fields from NF and Service create schemas", () => {
        const nfParsed = nfCreateBaseSchema.parse({
            typeId: VALID_COMPANY_UUID,
            numberNf: "1001",
            acessKey: "12345678901234567890123456789012345678901234",
            thirdPartyClientId: VALID_COMPANY_UUID,
            emissionDate: "2026-11-25",
            totalValue: 100,
            servicesId: VALID_COMPANY_UUID,
            cancelDate: "2026-11-25",
            pathFile: "/etc/passwd",
            active: false,
        });
        expect("cancelDate" in nfParsed).toBe(false);
        expect("pathFile" in nfParsed).toBe(false);
        expect("active" in nfParsed).toBe(false);

        const serviceParsed = serviceCreateBaseSchema.parse({
            id: VALID_COMPANY_UUID,
            serviceName: "Consultoria",
            price: "150.00",
            initialDate: "2026-11-25",
            clientId: VALID_COMPANY_UUID,
            details: "Detalhes",
        });
        expect("id" in serviceParsed).toBe(false);
    });

    it("enforces password length bounds consistently", () => {
        const longPassword = "A".repeat(100);
        expect(
            loginSchema.safeParse({ username: "user", password: longPassword }).success,
        ).toBe(true);
        expect(
            createCompanyUserBodySchema.safeParse({
                name: "Ana",
                surname: "Silva",
                email: "ana@empresa.com",
                cpf: "52998224725",
                password: "short",
                roleName: "finance",
            }).success,
        ).toBe(false);
    });
});

describe("Legal Controller Document Sanitization", () => {
    it("masks 11-digit personal CPFs while keeping CNPJs and descriptive labels intact", () => {
        expect(sanitizeLegalControllerDocument("529.982.247-25")).toBe(
            "***.982.247-**",
        );
        expect(sanitizeLegalControllerDocument("52998224725")).toBe(
            "***.982.247-**",
        );
        expect(sanitizeLegalControllerDocument("12.345.678/0001-99")).toBe(
            "12.345.678/0001-99",
        );
        expect(
            sanitizeLegalControllerDocument(
                "Pessoa Física (sob solicitação ao DPO)",
            ),
        ).toBe("Pessoa Física (sob solicitação ao DPO)");
        expect(sanitizeLegalControllerDocument(null)).toBeNull();
        expect(sanitizeLegalControllerDocument(undefined)).toBeNull();
        expect(sanitizeLegalControllerDocument("")).toBeNull();
        expect(sanitizeLegalControllerDocument("   ")).toBeNull();
    });
});

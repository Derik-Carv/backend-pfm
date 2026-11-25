import nodemailer from "nodemailer";
import path from "node:path";
import { ARCHIVE_ROOT, resolveSafeArchivePath } from "@/lib/archivePath";

export function escapeHtml(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

export function sanitizeHeaderValue(value: string, stripQuotes = false): string {
    const cleaned = value.replace(/[\r\n\0]+/g, " ").trim();
    return stripQuotes ? cleaned.replace(/"/g, "") : cleaned;
}

type NfInfo = {
    numberNf: string;
    value: string;
    emissionDate: string;
    acessKey: string;
    clientName: string;
    details?: string;
    destinationEmail: string;
    attachmentPath: string;
    companySender?: {
        tradeName: string;
        phone?: string | null;
        email?: string | null;
    };
    pixInfo?: {
        receiver: string;
        key: string;
        bankName?: string;
    };
};

const hostSmtp = process.env.SMTP_HOST;
const portSmtp = process.env.SMTP_PORT;
const authUserSmtp = {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
};
const name = process.env.NAME;

export const transport = nodemailer.createTransport({
    host: hostSmtp,
    port: portSmtp ? Number(portSmtp) : undefined,
    secure: portSmtp === "465",
    requireTLS: portSmtp !== "465",
    auth: authUserSmtp,
});

function ensureSmtpConfigured() {
    if (!hostSmtp || !portSmtp || !authUserSmtp.user || !authUserSmtp.pass) {
        throw new Error("SMTP_NOT_CONFIGURED");
    }
}

export async function sendVerificationCodeEmail(params: {
    to: string;
    code: string;
    purpose: "register" | "company_register" | "password_reset";
    recipientName?: string;
}) {
    ensureSmtpConfigured();

    const subject =
        params.purpose === "company_register"
            ? "Código de verificação — Solicitação de cadastro de empresa"
            : params.purpose === "register"
              ? "Código de verificação de cadastro — PFM"
              : "Código de recuperação de senha — PFM";

    const greeting = params.recipientName
        ? `Olá, <strong>${escapeHtml(params.recipientName)}</strong>,`
        : "Olá,";

    const actionLabel =
        params.purpose === "company_register"
            ? "confirmar a solicitação de cadastro da sua empresa"
            : params.purpose === "register"
              ? "concluir o seu cadastro no sistema"
              : "redefinir a sua senha de acesso";

    const safeFromName = sanitizeHeaderValue(name || "PFM", true);
    const safeTo = sanitizeHeaderValue(params.to);
    const safeCode = escapeHtml(params.code);

    try {
        // Nunca enviar BCC para códigos OTP / recuperação de senha
        return await transport.sendMail({
            from: `"${safeFromName}" <${authUserSmtp.user}>`,
            to: safeTo,
            subject,
            text: `Seu código de verificação para ${actionLabel} é: ${params.code}. Ele expira em 15 minutos. Se você não solicitou, ignore este e-mail.`,
            html: `
                <body style="margin: 0; padding: 24px; font-family: Arial, Helvetica, sans-serif; font-size: 15px; line-height: 1.6; color: #1a202c; background-color: #f7fafc;">
                    <div style="max-width: 520px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 28px;">
                        <p style="margin: 0 0 12px 0;">${greeting}</p>
                        <p style="margin: 0 0 20px 0;">
                            Use o código de verificação abaixo para ${actionLabel}:
                        </p>
                        <div style="margin: 0 0 22px 0; padding: 16px; text-align: center; background-color: #f0fdf4; border: 1px solid #86efac; border-radius: 8px;">
                            <span style="font-family: monospace, Courier New; font-size: 30px; font-weight: bold; letter-spacing: 8px; color: #065f46;">
                                ${safeCode}
                            </span>
                        </div>
                        <p style="margin: 0 0 14px 0; font-size: 13px; color: #4a5568;">
                            Este código é válido por <strong>15 minutos</strong> e deve ser utilizado apenas por você.
                        </p>
                        <p style="margin: 0; font-size: 13px; color: #718096;">
                            Se você não fez esta solicitação, apenas ignore este e-mail.
                        </p>
                    </div>
                </body>
            `,
        });
    } catch (error) {
        console.error(
            "Error sending verification code email:",
            error instanceof Error ? error.message : "unknown error",
        );
        throw new Error("EMAIL_SEND_FAILED");
    }
}

export async function sendCompanyRequestDecisionEmail(params: {
    to: string;
    companyName: string;
    adminName: string;
    decision: "received" | "approved" | "rejected";
    username?: string;
    reason?: string;
}) {
    try {
        ensureSmtpConfigured();

        const safeCompanyName = escapeHtml(params.companyName);
        const safeAdminName = escapeHtml(params.adminName);
        const safeUsername = escapeHtml(params.username || "");
        const safeToHtml = escapeHtml(params.to);
        const safeReasonHtml = escapeHtml(params.reason || "Não informado.");
        const headerCompanyName = sanitizeHeaderValue(params.companyName);

        let subject = "";
        let text = "";
        let bodyHtml = "";

        if (params.decision === "received") {
            subject = `Solicitação recebida — ${headerCompanyName}`;
            text = `Olá ${params.adminName}, recebemos a solicitação de cadastro da empresa ${params.companyName}. Ela está aguardando aprovação do administrador da plataforma.`;
            bodyHtml = `
                <p style="margin: 0 0 14px 0;">Recebemos a solicitação de cadastro da empresa <strong>${safeCompanyName}</strong>.</p>
                <p style="margin: 0 0 14px 0;">Seu pedido está na fila de análise do administrador da plataforma. Você receberá um novo e-mail assim que houver uma definição.</p>
            `;
        } else if (params.decision === "approved") {
            subject = `Cadastro aprovado — ${headerCompanyName}`;
            text = `Olá ${params.adminName}, o cadastro da empresa ${params.companyName} foi aprovado! Seu usuário de administrador é ${params.username}. Você já pode entrar com seu usuário ou e-mail e a senha cadastrada.`;
            bodyHtml = `
                <p style="margin: 0 0 14px 0;">Temos uma ótima notícia: o cadastro da empresa <strong>${safeCompanyName}</strong> foi <strong>aprovado</strong>!</p>
                <div style="margin: 0 0 18px 0; padding: 14px 16px; background-color: #f0fdf4; border: 1px solid #86efac; border-radius: 8px;">
                    <p style="margin: 0 0 6px 0;"><strong>Usuário de acesso:</strong> ${safeUsername}</p>
                    <p style="margin: 0;"><strong>E-mail de acesso:</strong> ${safeToHtml}</p>
                </div>
                <p style="margin: 0 0 14px 0;">Você já pode acessar o sistema utilizando seu usuário ou e-mail e a senha definida na solicitação.</p>
            `;
        } else {
            subject = `Solicitação não aprovada — ${headerCompanyName}`;
            text = `Olá ${params.adminName}, a solicitação de cadastro da empresa ${params.companyName} não foi aprovada. Motivo: ${params.reason || "Não informado"}.`;
            bodyHtml = `
                <p style="margin: 0 0 14px 0;">Informamos que a solicitação de cadastro da empresa <strong>${safeCompanyName}</strong> não foi aprovada.</p>
                <div style="margin: 0 0 18px 0; padding: 14px 16px; background-color: #fef2f2; border: 1px solid #fca5a5; border-radius: 8px; color: #991b1b;">
                    <strong>Motivo:</strong> ${safeReasonHtml}
                </div>
            `;
        }

        return await transport.sendMail({
            from: `"${sanitizeHeaderValue(name || "PFM", true)}" <${authUserSmtp.user}>`,
            to: sanitizeHeaderValue(params.to),
            subject: sanitizeHeaderValue(subject),
            text,
            html: `
                <body style="margin: 0; padding: 24px; font-family: Arial, Helvetica, sans-serif; font-size: 15px; line-height: 1.6; color: #1a202c; background-color: #f7fafc;">
                    <div style="max-width: 540px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 28px;">
                        <p style="margin: 0 0 12px 0;">Olá, <strong>${safeAdminName}</strong>,</p>
                        ${bodyHtml}
                        <p style="margin: 20px 0 0 0; font-size: 13px; color: #718096;">Atenciosamente, Equipe PFM.</p>
                    </div>
                </body>
            `,
        });
    } catch {
        return null;
    }
}

export async function sendEmailNf(nfData: NfInfo) {
    ensureSmtpConfigured();

    if (!nfData || !nfData.destinationEmail || !nfData.attachmentPath) {
        throw new Error(
            "Missing required parameters: nfData, destinationEmail or attachmentPath.",
        );
    }

    const safeAttachmentPath = resolveSafeArchivePath(nfData.attachmentPath);
    if (!safeAttachmentPath.startsWith(`${ARCHIVE_ROOT}${path.sep}`)) {
        throw new Error("INVALID_ARCHIVE_PATH");
    }

    const rawSenderName = nfData.companySender?.tradeName || name || "PFM";
    const senderHeaderName = sanitizeHeaderValue(rawSenderName, true);
    const senderNameHtml = escapeHtml(rawSenderName);
    const senderContactHtml = escapeHtml(
        nfData.companySender?.phone || nfData.companySender?.email || "",
    );
    const safeClientNameHtml = escapeHtml(nfData.clientName);
    const safeNumberNfHtml = escapeHtml(nfData.numberNf);
    const safeDetailsHtml = escapeHtml(
        nfData.details || "cobrança de serviços prestados",
    );
    const safeValueHtml = escapeHtml(nfData.value);
    const safeEmissionDateHtml = escapeHtml(nfData.emissionDate);
    const safeAccessKeyHtml = escapeHtml(nfData.acessKey);
    const safeSmtpUserHtml = escapeHtml(authUserSmtp.user ?? "");

    const pixSection = nfData.pixInfo
        ? `
                    <p style="margin: 0 0 10px 0; font-weight: bold; color: #1a202c;">
                        Dados para Pagamento (PIX):
                    </p>
                    <ul style="margin: 0 0 24px 0; padding-left: 24px;">
                        <li style="margin-bottom: 6px;"><strong>Favorecido:</strong> ${escapeHtml(nfData.pixInfo.receiver)}</li>
                        <li style="margin-bottom: 6px;"><strong>Chave PIX (CNPJ):</strong> ${escapeHtml(nfData.pixInfo.key)}</li>
                        ${nfData.pixInfo.bankName ? `<li style="margin-bottom: 6px;"><strong>Banco:</strong> ${escapeHtml(nfData.pixInfo.bankName)}</li>` : ""}
                    </ul>
              `
        : "";

    const attachmentFilename = sanitizeHeaderValue(
        `Nota_Fiscal_${nfData.numberNf}.pdf`,
        true,
    ).replace(/[/\\]/g, "_");

    try {
        // Multi-tenant LGPD: nunca enviar BCC global entre empresas nem expor dados bancários de outro tenant
        return await transport.sendMail({
            from: `"${senderHeaderName}" <${authUserSmtp.user}>`,
            to: sanitizeHeaderValue(nfData.destinationEmail),
            subject: sanitizeHeaderValue(
                `Nota Fiscal Eletrônica Nº ${nfData.numberNf} – ${nfData.clientName}`,
            ),
            attachments: [
                {
                    filename: attachmentFilename,
                    path: safeAttachmentPath,
                },
            ],
            html: `
                <body style="margin: 0; padding: 20px; font-family: Arial, Helvetica, sans-serif; font-size: 15px; line-height: 1.6; color: #2d3748; background-color: #ffffff;">
                    <p style="margin: 0 0 16px 0;">
                        Prezado(a) <strong>${safeClientNameHtml}</strong>,
                    </p>
                    <p style="margin: 0 0 20px 0;">
                        Segue em anexo a Nota Fiscal eletrônica Nº ${safeNumberNfHtml}, referente à ${safeDetailsHtml}.
                    </p>
                    <p style="margin: 0 0 10px 0; font-weight: bold; color: #1a202c;">
                        Resumo da Nota Fiscal:
                    </p>
                    <ul style="margin: 0 0 24px 0; padding-left: 24px;">
                        <li style="margin-bottom: 6px;"><strong>Nº da Nota:</strong> ${safeNumberNfHtml}</li>
                        <li style="margin-bottom: 6px;"><strong>Valor:</strong> R$ ${safeValueHtml}</li>
                        <li style="margin-bottom: 6px;"><strong>Data de Emissão:</strong> ${safeEmissionDateHtml}</li>
                        <li style="margin-bottom: 6px;">
                        <strong>Chave de Acesso:</strong><br>
                        <span style="font-family: monospace, Courier New; word-break: break-all; color: #4a5568;">${safeAccessKeyHtml}</span>
                        </li>
                    </ul>
                    ${pixSection}
                    <p style="margin: 0 0 24px 0; color: #4a5568;">
                        Este é um e-mail automático enviado por <a href="mailto:${safeSmtpUserHtml}" style="color: #3182ce; text-decoration: none;">${safeSmtpUserHtml}</a> em nome de <strong>${senderNameHtml}</strong>.
                    </p>
                    <p style="margin: 0 0 8px 0;">
                        Atenciosamente,
                    </p>
                    <p style="margin: 0 0 4px 0; font-weight: bold; color: #1a202c;">
                        ${senderNameHtml}
                    </p>
                    ${senderContactHtml ? `<p style="margin: 0; color: #4a5568;">${senderContactHtml}</p>` : ""}
                </body>
            `,
        });
    } catch (error) {
        throw new Error("EMAIL_SEND_FAILED", { cause: error });
    }
}

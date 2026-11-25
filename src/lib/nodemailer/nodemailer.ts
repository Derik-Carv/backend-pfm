import nodemailer from "nodemailer";
import path from "node:path";

type NfInfo = {
    numberNf: string;
    type: string;
    value: string;
    emissionDate: string;
    acessKey: string;
    clientName: string;
    details?: string;
    destinationEmail: string;
};

const hostSmtp = process.env.SMTP_HOST;
const portSmtp = process.env.SMTP_PORT;
const authUserSmtp = {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
};
const name = process.env.NAME;
const phone = process.env.PHONE;
const nameReceiver = process.env.NAME_RECEIVER;
const keyPix = process.env.KEY_PIX;
const bankName = process.env.BANK_NAME;

export const transport = nodemailer.createTransport({
    host: hostSmtp,
    port: portSmtp ? Number(portSmtp) : undefined,
    secure: portSmtp === "465",
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
              ? "Código de verificação de cadastro — Derik Flash"
              : "Código de recuperação de senha — Derik Flash";

    const greeting = params.recipientName
        ? `Olá, <strong>${params.recipientName}</strong>,`
        : "Olá,";

    const actionLabel =
        params.purpose === "company_register"
            ? "confirmar a solicitação de cadastro da sua empresa"
            : params.purpose === "register"
              ? "concluir o seu cadastro no sistema"
              : "redefinir a sua senha de acesso";

    try {
        // Nunca enviar BCC para códigos OTP / recuperação de senha
        return await transport.sendMail({
            from: `"${name || "Derik Flash"}" <${authUserSmtp.user}>`,
            to: params.to,
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
                                ${params.code}
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
        console.error("Error sending verification code email:", error);
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

        let subject = "";
        let text = "";
        let bodyHtml = "";

        if (params.decision === "received") {
            subject = `Solicitação recebida — ${params.companyName}`;
            text = `Olá ${params.adminName}, recebemos a solicitação de cadastro da empresa ${params.companyName}. Ela está aguardando aprovação do administrador da plataforma.`;
            bodyHtml = `
                <p style="margin: 0 0 14px 0;">Recebemos a solicitação de cadastro da empresa <strong>${params.companyName}</strong>.</p>
                <p style="margin: 0 0 14px 0;">Seu pedido está na fila de análise do administrador da plataforma. Você receberá um novo e-mail assim que houver uma definição.</p>
            `;
        } else if (params.decision === "approved") {
            subject = `Cadastro aprovado — ${params.companyName}`;
            text = `Olá ${params.adminName}, o cadastro da empresa ${params.companyName} foi aprovado! Seu usuário de administrador é ${params.username}. Você já pode entrar com seu usuário ou e-mail e a senha cadastrada.`;
            bodyHtml = `
                <p style="margin: 0 0 14px 0;">Temos uma ótima notícia: o cadastro da empresa <strong>${params.companyName}</strong> foi <strong>aprovado</strong>!</p>
                <div style="margin: 0 0 18px 0; padding: 14px 16px; background-color: #f0fdf4; border: 1px solid #86efac; border-radius: 8px;">
                    <p style="margin: 0 0 6px 0;"><strong>Usuário de acesso:</strong> ${params.username || ""}</p>
                    <p style="margin: 0;"><strong>E-mail de acesso:</strong> ${params.to}</p>
                </div>
                <p style="margin: 0 0 14px 0;">Você já pode acessar o sistema utilizando seu usuário ou e-mail e a senha definida na solicitação.</p>
            `;
        } else {
            subject = `Solicitação não aprovada — ${params.companyName}`;
            text = `Olá ${params.adminName}, a solicitação de cadastro da empresa ${params.companyName} não foi aprovada. Motivo: ${params.reason || "Não informado"}.`;
            bodyHtml = `
                <p style="margin: 0 0 14px 0;">Informamos que a solicitação de cadastro da empresa <strong>${params.companyName}</strong> não foi aprovada.</p>
                <div style="margin: 0 0 18px 0; padding: 14px 16px; background-color: #fef2f2; border: 1px solid #fca5a5; border-radius: 8px; color: #991b1b;">
                    <strong>Motivo:</strong> ${params.reason || "Não informado."}
                </div>
            `;
        }

        return await transport.sendMail({
            from: `"${name || "Derik Flash"}" <${authUserSmtp.user}>`,
            to: params.to,
            subject,
            text,
            html: `
                <body style="margin: 0; padding: 24px; font-family: Arial, Helvetica, sans-serif; font-size: 15px; line-height: 1.6; color: #1a202c; background-color: #f7fafc;">
                    <div style="max-width: 540px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 28px;">
                        <p style="margin: 0 0 12px 0;">Olá, <strong>${params.adminName}</strong>,</p>
                        ${bodyHtml}
                        <p style="margin: 20px 0 0 0; font-size: 13px; color: #718096;">Atenciosamente, Equipe Derik Flash.</p>
                    </div>
                </body>
            `,
        });
    } catch (error) {
        console.error("Error sending company request decision email:", error);
        return null;
    }
}

export async function sendEmailNf(nfData: NfInfo) {
    try {
        ensureSmtpConfigured();

        if (!nfData || !nfData.destinationEmail) {
            throw new Error(
                "Missing required parameters: nfData or destinationEmail.",
            );
        }

        const response = await transport.sendMail({
            from: authUserSmtp.user,
            to: nfData.destinationEmail,
            bcc: process.env.BCC_LIST,
            subject: `Nota Fiscal Eletrônica Nº ${nfData.numberNf} – ${nfData.clientName}`,
            attachments: [
                {
                    filename: `Nota_Fiscal_${nfData.numberNf}.pdf`,
                    path: path.join(
                        process.cwd(),
                        "archives",
                        nfData.type,
                        `${nfData.acessKey}.pdf`,
                    ),
                },
            ],
            html: `
                <body style="margin: 0; padding: 20px; font-family: Arial, Helvetica, sans-serif; font-size: 15px; line-height: 1.6; color: #2d3748; background-color: #ffffff;">
                    <p style="margin: 0 0 16px 0;">
                        Prezado(a) <strong>${nfData.clientName}</strong>,
                    </p>
                    <p style="margin: 0 0 20px 0;">
                        Segue em anexo a Nota Fiscal eletrônica Nº ${nfData.numberNf}, referente à ${nfData.details}.
                    </p>
                    <p style="margin: 0 0 10px 0; font-weight: bold; color: #1a202c;">
                        Resumo da Nota Fiscal:
                    </p>
                    <ul style="margin: 0 0 24px 0; padding-left: 24px;">
                        <li style="margin-bottom: 6px;"><strong>Nº da Nota:</strong> ${nfData.numberNf}</li>
                        <li style="margin-bottom: 6px;"><strong>Valor:</strong> R$ ${nfData.value}</li>
                        <li style="margin-bottom: 6px;"><strong>Data de Emissão:</strong> ${nfData.emissionDate}</li>
                        <li style="margin-bottom: 6px;">
                        <strong>Chave de Acesso:</strong><br>
                        <span style="font-family: monospace, Courier New; word-break: break-all; color: #4a5568;">${nfData.acessKey}</span>
                        </li>
                    </ul>
                    
                    <p style="margin: 0 0 10px 0; font-weight: bold; color: #1a202c;">
                        Dados para Pagamento (PIX):
                    </p>
                    <ul style="margin: 0 0 24px 0; padding-left: 24px;">
                        <li style="margin-bottom: 6px;"><strong>Favorecido:</strong> ${nameReceiver}</li>
                        <li style="margin-bottom: 6px;"><strong>Chave PIX (CNPJ):</strong> ${keyPix}</li>
                        <li style="margin-bottom: 6px;"><strong>Banco:</strong> ${bankName}</li>
                    </ul>

                    <p style="margin: 0 0 24px 0; color: #4a5568;">
                        Este é um e-mail automático enviado por <a href="mailto:${authUserSmtp.user}" style="color: #3182ce; text-decoration: none;">${authUserSmtp.user}</a>.
                        Em caso de dúvidas ou necessidade de esclarecimentos, entre em contato pelo número de telefone abaixo.
                    </p>
                    <p style="margin: 0 0 8px 0;">
                        Atenciosamente,
                    </p>
                    <p style="margin: 0 0 4px 0; font-weight: bold; color: #1a202c;">
                        ${name}
                    </p>
                    <p style="margin: 0; color: #4a5568;">
                        ${phone}
                    </p>
                </body>
            `,
        });

        return response;
    } catch (error) {
        console.error("Error sending email:", error);
    }
}

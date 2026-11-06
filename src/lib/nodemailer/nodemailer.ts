import nodemailer from "nodemailer";

type NfInfo = {
    numberNf: string;
    value: string;
    emissionDate: string;
    acessKey: string;
    clientName: string;
    details: string;
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

const transport = nodemailer.createTransport({
    host: hostSmtp,
    port: portSmtp,
    secure: portSmtp === "465",
    auth: authUserSmtp,
});

export async function sendEmailNf(nfData: NfInfo, destinationEmail: string) {
    try {
        if (
            !hostSmtp ||
            !portSmtp ||
            !authUserSmtp.user ||
            !authUserSmtp.pass
        ) {
            throw new Error("SMTP configuration is missing.");
        }

        if (!nfData || !destinationEmail) {
            throw new Error(
                "Missing required parameters: nfData or destinationEmail.",
            );
        }

        const response = await transport.sendMail({
            from: authUserSmtp.user,
            to: destinationEmail,
            bcc: process.env.BCC_LIST,
            subject: `Nota Fiscal Eletrônica Nº ${nfData.numberNf} – ${nfData.clientName}`,
            attachments: [
                {
                    filename: `Nota_Fiscal_${nfData.numberNf}.pdf`,
                    path: `../../../archives/`,
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

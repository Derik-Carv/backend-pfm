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

const transport = nodemailer.createTransport({
    host: hostSmtp,
    port: portSmtp,
    secure: false,
    auth: authUserSmtp,
});

export async function sendEmailNf(nfData: NfInfo, destinationEmail: string) {}

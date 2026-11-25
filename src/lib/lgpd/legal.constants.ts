export const LEGAL_TERMS_VERSION = "2026-11-24-v2";
export const LEGAL_PRIVACY_VERSION = "2026-11-24-v2";

export const DPO_NAME =
    process.env.DPO_NAME ||
    "Canal de Privacidade / Encarregado (Agente de Pequeno Porte — Res. CD/ANPD nº 2/2022 e nº 18/2024)";
export const DPO_EMAIL =
    process.env.DPO_EMAIL || "privacidade@derikdev.cloud";

export function maskCpf(cpf: string | null | undefined): string {
    if (!cpf) return "";
    if (cpf.startsWith("ANON-")) return "ANONIMIZADO";
    const digits = cpf.replace(/\D/g, "");
    if (digits.length === 11) {
        return `***.${digits.slice(3, 6)}.${digits.slice(6, 9)}-**`;
    }
    return "***";
}

export function getLegalMetadata() {
    return {
        termsVersion: LEGAL_TERMS_VERSION,
        privacyVersion: LEGAL_PRIVACY_VERSION,
        dpo: {
            name: DPO_NAME,
            email: DPO_EMAIL,
        },
        fiscalRetentionYears: 5,
        auditLogRetentionYears: 5,
        incidentRetentionYears: 5,
        incidentNotificationBusinessDays: 3,
        smallAgentNotificationBusinessDays: 6,
        otpRetentionHours: 24,
        rejectedRequestRetentionDays: 90,
        subprocessors: [
            {
                name: "Oracle Cloud Infrastructure",
                purpose: "Hospedagem da API e banco de dados PostgreSQL",
                mechanism:
                    "Região Brasil / Cláusulas-Padrão Contratuais (Res. CD/ANPD nº 19/2024)",
            },
            {
                name: "Vercel",
                purpose: "Hospedagem da aplicação web frontend",
                mechanism:
                    "Cláusulas-Padrão Contratuais (Res. CD/ANPD nº 19/2024)",
            },
            {
                name: "Provedor SMTP",
                purpose: "Envio de códigos OTP, notificações e notas fiscais",
                mechanism:
                    "Cláusulas-Padrão Contratuais (Res. CD/ANPD nº 19/2024)",
            },
            {
                name: "Axiom (quando habilitado)",
                purpose: "Telemetria técnica e logs sanitizados de produção",
                mechanism:
                    "Cláusulas-Padrão Contratuais (Res. CD/ANPD nº 19/2024) / Adequação UE quando aplicável",
            },
        ],
    };
}

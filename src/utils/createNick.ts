export function generateNick(name: string, surname: string): string {
    const sanitize = (text: string): string => {
        return text
            .trim()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, "");
    };

    const cleanName = sanitize(name);
    const cleanSurname = sanitize(surname);

    const firstName = cleanName.split(/\s+/)[0] || "";

    const surnameParts = cleanSurname.split(/\s+/).filter(Boolean);
    const lastSurname = surnameParts[surnameParts.length - 1] || "";

    if (!lastSurname) return firstName;
    if (!firstName) return lastSurname;

    return `${firstName}.${lastSurname}`;
}

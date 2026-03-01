export function parseEducationEntry(entry: {
    type: string;
    field?: string;
    institution: string;
    start: string;
    end?: string;
}) {
    const hasField = entry.field && entry.field.trim() !== '';
    const hasEnd = entry.end && entry.end.trim() !== '';
    if (hasField && hasEnd) return "education.item.full";
    if (hasField && !hasEnd) return "education.item.partial.no_end";
    if (!hasField && hasEnd) return "education.item.partial.no_field";
    return "education.item.partial.no_field_no_end";
}

export function formatEducationEntry(template: string, entry: {
    type: string;
    field?: string;
    institution: string;
    start: string;
    end?: string;
}) {
    return template
        .replace("{type}", entry.type)
        .replace("{field}", entry.field || "")
        .replace("{institution}", entry.institution)
        .replace("{start}", entry.start)
        .replace("{end}", entry.end || "");
}

export function formatAuthorACMDL(a: Author, i: number): React.ReactElement {
  const trimmedFirstName = a.firstName.trim();
  const trimmedLastName = a.lastName.trim();
  const trimmedSuffix = a.suffix?.trim();
  const fullName = trimmedFirstName ? `${trimmedFirstName} ${trimmedLastName}` : trimmedLastName;
  const renderedNameRaw = trimmedSuffix ? `${fullName} ${trimmedSuffix}` : fullName;


  return (
    <span key={a.orcid ?? `${fullName}-${i}`} className={a.highlight ? "highlight-author" : undefined}>
      {renderedNameRaw}
    </span>
  );
}

export function joinAuthorsACMDL(authors: Author[]): React.ReactNode[] {
  const names = authors.map((a, i) => formatAuthorACMDL(a, i));
  if (names.length <= 1) return names;
  if (names.length === 2) return [names[0], " and ", names[1]];

  const parts: React.ReactNode[] = [];
  names.forEach((n, i) => {
    parts.push(n);
    if (i < names.length - 2) parts.push(", ");
    else if (i === names.length - 2) parts.push(", and ");
  });
  return parts;
}

export function venueShortToAcmQuote(s: string) {
  return s.replace(/‘/g, "'");
}

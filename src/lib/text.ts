/** Case- and diacritic-insensitive form for search ("Artırım" matches "artirim"). */
export function normalizeText(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.charAt(0) ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.charAt(0) ?? "") : "";
  return (first + last).toLocaleUpperCase("tr-TR");
}

export function cardKey(boardKey: string, number: number): string {
  return `${boardKey}-${number}`;
}

// Formatage de la date de l'événement en français, ex. "Samedi 12 juin 2027".
export function formatEventDate(iso: string | null): string {
  if (!iso) return "";
  try {
    const d = new Date(iso + "T00:00:00");
    const s = new Intl.DateTimeFormat("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(d);
    return s.charAt(0).toUpperCase() + s.slice(1);
  } catch {
    return "";
  }
}

import { notFound } from "next/navigation";
import { getEventBySlug } from "@/lib/events";

export const dynamic = "force-dynamic";

// Layout d'un événement : charge le mariage, applique ses couleurs et
// enveloppe les écrans invités dans la "coque" mobile.
export default async function EventLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { slug: string };
}) {
  const event = await getEventBySlug(params.slug);
  if (!event) notFound();

  const primary = event.color_primary || "#4f6152";
  const accent = event.color_accent || "#b08748";

  // Couleurs propres à ce mariage (les teintes s'adaptent au thème clair/sombre
  // grâce à color-mix avec --surface).
  const themeCss = `
    .app-shell[data-event-theme] {
      --sage: ${primary};
      --sage-strong: color-mix(in srgb, ${primary} 80%, #000);
      --sage-tint: color-mix(in srgb, ${primary} 15%, var(--surface));
      --champ: ${accent};
      --champ-tint: color-mix(in srgb, ${accent} 18%, var(--surface));
    }
  `;

  return (
    <main className="app-shell" data-event-theme>
      <style dangerouslySetInnerHTML={{ __html: themeCss }} />
      {children}
    </main>
  );
}

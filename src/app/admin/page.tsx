import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { WeddingEvent } from "@/lib/types";
import ThemeToggle from "@/components/ThemeToggle";
import SignOutButton from "@/components/admin/SignOutButton";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  // Événements que cet utilisateur administre.
  const { data: memberships } = await supabase
    .from("event_admins")
    .select("event_id");
  const ids = (memberships ?? []).map((m) => m.event_id);

  let events: WeddingEvent[] = [];
  if (ids.length > 0) {
    const { data } = await supabase
      .from("events")
      .select(
        "id, slug, couple_names, event_date, place, welcome_message, color_primary, color_accent, game_active, gallery_public, is_active, created_at"
      )
      .in("id", ids)
      .order("created_at", { ascending: false });
    events = (data as WeddingEvent[]) ?? [];
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-[9px] w-[9px] rounded-full" style={{ background: "var(--champ)" }} />
          <span className="text-[11px] font-bold uppercase" style={{ letterSpacing: "0.34em", color: "var(--ink-soft)" }}>
            Éclats · Admin
          </span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <SignOutButton />
        </div>
      </div>

      <h1 className="display text-[34px] leading-tight">Vos mariages</h1>
      <p className="mt-1 text-[14px]" style={{ color: "var(--ink-soft)" }}>
        Connecté en tant que {user.email}
      </p>

      {events.length === 0 ? (
        <div className="card mt-6 p-6">
          <p className="font-semibold">Aucun mariage lié à ce compte pour l&apos;instant.</p>
          <p className="mt-2 text-[14px]" style={{ color: "var(--ink-soft)" }}>
            Relie ton compte à un mariage depuis Supabase (SQL Editor) — voir la
            section « Créer ton accès admin » du README. Puis recharge cette page.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {events.map((e) => (
            <Link
              key={e.id}
              href={`/admin/${e.slug}`}
              className="card block p-5 transition hover:shadow-soft"
            >
              <div className="flex items-center justify-between">
                <span className="eyebrow">{e.is_active ? "Ouvert" : "Fermé"}</span>
                <span
                  className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                  style={{
                    background: e.game_active ? "var(--sage-tint)" : "var(--surface)",
                    color: e.game_active ? "var(--sage)" : "var(--ink-faint)",
                  }}
                >
                  {e.game_active ? "🎲 Jeu actif" : "Jeu en pause"}
                </span>
              </div>
              <div className="display mt-3 text-[24px]">{e.couple_names}</div>
              <div className="mt-1 text-[13px]" style={{ color: "var(--ink-soft)" }}>
                /e/{e.slug}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

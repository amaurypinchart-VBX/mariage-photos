import { getEventBySlug } from "@/lib/events";
import { formatEventDate } from "@/lib/format";
import { notFound } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";
import NameGate from "@/components/guest/NameGate";

export const dynamic = "force-dynamic";

export default async function EventWelcome({
  params,
}: {
  params: { slug: string };
}) {
  const event = await getEventBySlug(params.slug);
  if (!event) notFound();

  const [n1, n2] = splitNames(event.couple_names);

  return (
    <>
      <div className="flex items-center justify-between px-5 pb-1.5 pt-4">
        <div className="flex items-center gap-2">
          <span
            className="h-[9px] w-[9px] rounded-full"
            style={{ background: "var(--champ)" }}
          />
          <span
            className="text-[11px] font-bold uppercase"
            style={{ letterSpacing: "0.34em", color: "var(--ink-soft)" }}
          >
            Éclats
          </span>
        </div>
        <ThemeToggle />
      </div>

      <div className="flex flex-1 flex-col px-[26px] pb-[26px] pt-2">
        {/* Couverture */}
        <div
          className="relative mt-2 flex h-[236px] flex-col justify-end overflow-hidden rounded-card border"
          style={{
            borderColor: "var(--line)",
            background:
              "radial-gradient(120% 90% at 20% 0%, var(--champ-tint) 0%, transparent 55%), linear-gradient(160deg, var(--sage-tint) 0%, var(--surface-2) 60%)",
          }}
        >
          <div
            className="pointer-events-none absolute left-[18px] right-[18px] top-[18px] h-[200px] rounded-t-[120px] border border-b-0 opacity-[0.65]"
            style={{ borderColor: "var(--line-strong)" }}
          />
          <div className="relative px-[22px] pb-6 pt-[22px] text-center">
            {event.event_date && (
              <div
                className="text-[12px] font-semibold uppercase"
                style={{ letterSpacing: "0.22em", color: "var(--ink-soft)" }}
              >
                {formatEventDate(event.event_date)}
              </div>
            )}
            <div className="display mb-0.5 mt-2 text-[44px] leading-[1.02]">
              {n1}
              {n2 && (
                <>
                  {" "}
                  <span className="italic" style={{ color: "var(--champ)" }}>
                    &amp;
                  </span>{" "}
                  {n2}
                </>
              )}
            </div>
            {event.place && (
              <div
                className="mt-1.5 text-[12.5px]"
                style={{ color: "var(--ink-soft)" }}
              >
                {event.place}
              </div>
            )}
          </div>
        </div>

        <p
          className="mx-0.5 mb-1 mt-[22px] text-center text-[15px]"
          style={{ color: "var(--ink-soft)" }}
        >
          {event.welcome_message ||
            "Vous avez capturé un moment ? Partagez-le avec nous — chaque photo compte pour raconter notre journée."}
        </p>

        <NameGate slug={event.slug} gameActive={event.game_active} />

        <div
          className="mt-auto flex items-center justify-center gap-[7px] pt-5 text-center text-xs"
          style={{ color: "var(--ink-faint)" }}
        >
          <span>♥</span> Tes photos ne sont visibles que par les mariés
        </div>
      </div>
    </>
  );
}

function splitNames(couple: string): [string, string | null] {
  const parts = couple.split(/\s*[&+]\s*|\s+et\s+/i);
  if (parts.length >= 2) return [parts[0].trim(), parts.slice(1).join(" & ").trim()];
  return [couple, null];
}

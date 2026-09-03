import Link from "next/link";
import ThemeToggle from "./ThemeToggle";

// Barre supérieure : bouton retour optionnel à gauche, marque au centre/droite.
export default function BrandBar({
  backHref,
  showTheme = true,
}: {
  backHref?: string;
  showTheme?: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-5 pb-1.5 pt-4">
      {backHref ? (
        <Link
          href={backHref}
          className="flex items-center gap-1.5 py-1.5 text-sm font-semibold"
          style={{ color: "var(--ink-soft)" }}
        >
          ‹ Retour
        </Link>
      ) : (
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
      )}

      {backHref ? (
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
      ) : showTheme ? (
        <ThemeToggle />
      ) : (
        <span />
      )}
    </div>
  );
}

import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";

export const dynamic = "force-dynamic";

// Page d'accueil du site (racine). Les invités arrivent normalement
// directement sur /e/<slug> via le QR code ; cette page sert de vitrine.
export default function Home() {
  return (
    <main className="app-shell">
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

      <div className="flex flex-1 flex-col px-6 pb-10 pt-4">
        <div
          className="card flex h-[220px] flex-col items-center justify-center px-6 text-center"
          style={{
            background:
              "radial-gradient(120% 90% at 20% 0%, var(--champ-tint) 0%, transparent 55%), linear-gradient(160deg, var(--sage-tint) 0%, var(--surface-2) 60%)",
          }}
        >
          <p className="eyebrow mb-3">Photos de mariage</p>
          <h1 className="display text-[40px] leading-none">Éclats</h1>
          <p
            className="mt-3 text-sm"
            style={{ color: "var(--ink-soft)" }}
          >
            Le partage de souvenirs, en beau et sans effort.
          </p>
        </div>

        <p
          className="mt-6 text-center text-[15px]"
          style={{ color: "var(--ink-soft)" }}
        >
          Vos invités scannent un QR code, déposent leurs photos et jouent à la
          roulette photo. Vous retrouvez tous les souvenirs dans un espace
          privé.
        </p>

        <div className="mt-auto flex flex-col gap-3 pt-8">
          <Link href="/admin" className="btn btn-primary">
            Espace organisateurs
          </Link>
          <p
            className="text-center text-xs"
            style={{ color: "var(--ink-faint)" }}
          >
            Un lien invité ressemble à&nbsp;:{" "}
            <code>/e/votre-mariage</code>
          </p>
        </div>
      </div>
    </main>
  );
}

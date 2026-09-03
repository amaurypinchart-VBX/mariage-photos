import Link from "next/link";

export default function EventNotFound() {
  return (
    <main className="app-shell flex flex-col items-center justify-center px-8 py-20 text-center">
      <div
        className="mb-4 grid h-16 w-16 place-items-center rounded-full text-[28px]"
        style={{ background: "var(--champ-tint)", color: "var(--champ)" }}
      >
        🔍
      </div>
      <h1 className="display text-[26px]">Ce mariage est introuvable</h1>
      <p className="mt-2 max-w-[300px] text-[14px]" style={{ color: "var(--ink-soft)" }}>
        Le lien a peut-être expiré ou comporte une erreur. Vérifie le QR code ou
        demande le bon lien aux mariés.
      </p>
      <Link href="/" className="btn btn-ghost mt-6">
        Retour à l&apos;accueil
      </Link>
    </main>
  );
}

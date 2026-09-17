// Accès centralisé aux variables d'environnement publiques.
// On ne jette pas d'erreur au chargement du module pour que `next build`
// fonctionne même sans .env.local ; la validation se fait à l'usage.

export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co";

export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "placeholder-anon-key";

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// Clé privilégiée, JAMAIS préfixée NEXT_PUBLIC_ : ne doit jamais atteindre le
// navigateur. Utilisée uniquement par src/lib/supabase/admin.ts, côté serveur,
// pour servir les liens de partage invités (voir SECURITY_AND_GDPR.md).
export const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export function assertSupabaseConfigured() {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    throw new Error(
      "Supabase n'est pas configuré : renseigne NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY dans .env.local"
    );
  }
}

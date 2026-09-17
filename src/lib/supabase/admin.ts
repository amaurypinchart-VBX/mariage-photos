import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL } from "@/lib/env";

// Client Supabase privilégié (clé service_role), réservé au code serveur.
// Sert uniquement à servir les liens de partage invités : valider un token
// et lire/signer les photos correspondantes, en contournant volontairement
// les RLS (le token lui-même est l'autorisation). Ne jamais importer ce
// fichier depuis un composant "use client".
export function createAdminClient() {
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY manquante : renseigne-la dans .env.local (et sur Vercel) pour activer les liens de partage."
    );
  }
  return createSupabaseClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

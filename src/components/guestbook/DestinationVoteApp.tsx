"use client";

import { useGuestbookAuth } from "@/lib/useGuestbookAuth";
import GuestbookGate from "./GuestbookGate";
import DestinationPoll from "./DestinationPoll";

// Vote destination de lune de miel en accès direct (depuis un lien de
// partage ou la page "Tes photos"), sans passer par le livre d'or. Réutilise
// la même identité invité (prénom + code) : un invité qui a déjà signé le
// livre d'or vote directement, les autres s'identifient une seule fois.
export default function DestinationVoteApp({ slug, eventId }: { slug: string; eventId: string }) {
  const { guestId, loaded, save } = useGuestbookAuth(slug);

  if (!loaded) return null;

  if (!guestId) {
    return (
      <GuestbookGate
        slug={slug}
        onLoggedIn={save}
        intro="Écris ton prénom et choisis un code à 4 chiffres pour voter (le même qu'au livre d'or, si tu l'as déjà signé)."
        submitLabel={<>✈️ Voter</>}
      />
    );
  }

  return <DestinationPoll eventId={eventId} slug={slug} guestId={guestId} />;
}

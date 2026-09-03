"use client";

import { useGuestName } from "@/lib/useGuestName";

export default function GuestGreeting({ slug }: { slug: string }) {
  const { name } = useGuestName(slug);
  return (
    <div className="eyebrow mb-[9px]">
      {name ? `Merci ${name}` : "Tes souvenirs"}
    </div>
  );
}

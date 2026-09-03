"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignOutButton() {
  const router = useRouter();
  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }
  return (
    <button
      onClick={signOut}
      className="rounded-full border px-3 py-1.5 text-[13px] font-semibold transition"
      style={{ borderColor: "var(--line-strong)", color: "var(--ink-soft)" }}
    >
      Déconnexion
    </button>
  );
}

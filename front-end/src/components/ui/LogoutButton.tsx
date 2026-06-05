"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
      router.replace("/");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      aria-busy={loading}
      aria-label={loading ? "Saindo da sessão" : "Sair da área administrativa"}
      className="btn-ghost text-slate-400 hover:text-red-300 hover:border-red-900/50"
    >
      {loading ? "Saindo…" : "Sair"}
    </button>
  );
}

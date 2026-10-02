"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/** Botão discreto "Instalar app" — só aparece quando o browser oferece o prompt. */
export function InstallPwaButton() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!prompt) return null;

  return (
    <button
      type="button"
      className="btn-ghost text-xs"
      onClick={() => {
        void prompt.prompt();
        void prompt.userChoice.finally(() => setPrompt(null));
      }}
    >
      Instalar app
    </button>
  );
}

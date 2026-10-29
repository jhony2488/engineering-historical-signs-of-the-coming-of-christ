"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * Botão de instalação PWA — aparece quando o browser oferece o prompt.
 * Com tracking de aceitação/rejeição e display inteligente após N sessões.
 */
export function InstallPwaButton() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [dismissUntil, setDismissUntil] = useState<number | null>(null);

  useEffect(() => {
    // Detect iOS
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !("MSStream" in window);
    setIsIOS(ios);

    // Check if already installed
    const installed = localStorage.getItem("pwa_installed") === "true";
    setIsInstalled(installed);

    // Check if dismissed until a future date
    const dismissed = localStorage.getItem("pwa_dismiss_until");
    if (dismissed) {
      const dismissDate = parseInt(dismissed, 10);
      if (Date.now() < dismissDate) {
        setDismissUntil(dismissDate);
        return; // Don't show prompt if dismissed
      }
    }

    // Contar sessões para mostrar prompt inteligente
    const count = parseInt(localStorage.getItem("pwa_session_count") || "0", 10);
    setSessionCount(count);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);

      // Mostrar modal após 3 sessões
      if (count >= 3) {
        setShowModal(true);
      }
    };

    const onInstalled = () => {
      setPrompt(null);
      setShowModal(false);
      setIsInstalled(true);
      localStorage.setItem("pwa_installed", "true");
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    // Incrementar contador de sessões
    localStorage.setItem("pwa_session_count", String(count + 1));

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [sessionCount]);

  const handleInstall = async () => {
    if (!prompt) return;

    const { outcome } = await prompt.prompt();
    setPrompt(null);
    setShowModal(false);

    // Tracking de aceitação/rejeição
    localStorage.setItem("pwa_install_outcome", outcome);

    if (outcome === "accepted") {
      localStorage.setItem("pwa_installed", "true");
    }
  };

  const handleDismiss = () => {
    setShowModal(false);
    localStorage.setItem("pwa_install_outcome", "dismissed");
    // Remind later: dismiss for 7 days
    const dismissDate = Date.now() + 7 * 24 * 60 * 60 * 1000;
    localStorage.setItem("pwa_dismiss_until", String(dismissDate));
  };

  const handleRemindLater = () => {
    setShowModal(false);
    localStorage.setItem("pwa_install_outcome", "remind_later");
    // Remind later: dismiss for 3 days
    const dismissDate = Date.now() + 3 * 24 * 60 * 60 * 1000;
    localStorage.setItem("pwa_dismiss_until", String(dismissDate));
  };

  const handleInstallClick = () => {
    void handleInstall();
  };

  // Botão discreto no header
  if (!showModal && prompt && !isInstalled) {
    return (
      <button
        type="button"
        className="btn-ghost text-xs"
        onClick={handleInstallClick}
      >
        Instalar app
      </button>
    );
  }

  // Indicador de app instalado
  if (isInstalled) {
    return (
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
        <span>App instalado</span>
      </div>
    );
  }

  // iOS: instruções de instalação manual
  if (isIOS && !isInstalled && sessionCount >= 3 && !dismissUntil) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/80 backdrop-blur-sm">
        <div className="max-w-md rounded-lg border border-ink-700 bg-ink-950 p-6 shadow-2xl">
          <h3 className="mb-3 text-lg font-display font-medium text-white">
            Instalar no iPhone/iPad
          </h3>
          <p className="mb-4 text-sm text-slate-300">
            Para instalar o Sinais Históricos no seu dispositivo iOS:
          </p>
          <ol className="mb-6 space-y-2 text-sm text-slate-400 list-decimal list-inside">
            <li>Toque no botão Compartilhar</li>
            <li>Selecione &quot;Adicionar à Tela de Início&quot;</li>
            <li>Toque &quot;Adicionar&quot; no canto superior direito</li>
          </ol>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleDismiss}
              className="flex-1 rounded-lg border border-ink-600 px-4 py-2 text-sm text-slate-300 transition-colors hover:border-ink-500 hover:text-slate-200"
            >
              Entendi
            </button>
            <button
              type="button"
              onClick={handleRemindLater}
              className="flex-1 rounded-lg border border-ink-600 px-4 py-2 text-sm text-slate-300 transition-colors hover:border-ink-500 hover:text-slate-200"
            >
              Lembrar depois
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Modal customizado após N sessões (Android/Desktop)
  if (showModal && prompt && !isInstalled) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/80 backdrop-blur-sm">
        <div className="max-w-md rounded-lg border border-ink-700 bg-ink-950 p-6 shadow-2xl">
          <h3 className="mb-3 text-lg font-display font-medium text-white">
            Instalar App
          </h3>
          <p className="mb-4 text-sm text-slate-300">
            Instale o Sinais Históricos no seu dispositivo para:
          </p>
          <ul className="mb-6 space-y-2 text-sm text-slate-400">
            <li className="flex items-start gap-2">
              <span className="text-gold-400">✓</span>
              <span>Acesso rápido na home screen</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gold-400">✓</span>
              <span>Funciona offline com dados em cache</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gold-400">✓</span>
              <span>Notificações push automáticas</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gold-400">✓</span>
              <span>Experiência nativa sem navegador</span>
            </li>
          </ul>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleInstallClick}
              className="flex-1 rounded-lg bg-gold-600 px-4 py-2 text-sm font-medium text-ink-950 transition-colors hover:bg-gold-500"
            >
              Instalar agora
            </button>
            <button
              type="button"
              onClick={handleRemindLater}
              className="flex-1 rounded-lg border border-ink-600 px-4 py-2 text-sm text-slate-300 transition-colors hover:border-ink-500 hover:text-slate-200"
            >
              Lembrar depois
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

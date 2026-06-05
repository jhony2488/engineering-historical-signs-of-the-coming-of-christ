"use client";

import { FormEvent, useState } from "react";

import { triggerSplineCelebration } from "@/lib/spline-celebration";
import type { NewsletterSource } from "@/lib/types";

interface EmailSignupFormProps {
  source: NewsletterSource;
  compact?: boolean;
  title?: string;
  description?: string;
}

export function EmailSignupForm({
  source,
  compact = false,
  title = "Receba avisos das atualizações diárias e novidades",
  description = "Inscreva-se para ser avisado quando novas profecias forem detectadas e o painel for atualizado (~04:00 BRT).",
}: EmailSignupFormProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage(null);

    try {
      const res = await fetch("/api/db/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setStatus("error");
        setMessage(data.error ?? "Não foi possível concluir a inscrição.");
        return;
      }

      setStatus("success");
      setMessage("Inscrição confirmada. Você receberá avisos das próximas atualizações.");
      setEmail("");
      triggerSplineCelebration();
    } catch {
      setStatus("error");
      setMessage("Erro de rede. Tente novamente em instantes.");
    }
  }

  const formId = `newsletter-${source}`;

  return (
    <section
      className={compact ? "newsletter-signup newsletter-signup--compact" : "newsletter-signup"}
      aria-labelledby={`${formId}-title`}
    >
      <div className="newsletter-signup-copy">
        <h2 id={`${formId}-title`} className="newsletter-signup-title">
          {title}
        </h2>
        {!compact && (
          <p className="newsletter-signup-description">{description}</p>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="newsletter-signup-form"
        aria-label="Formulário de inscrição por e-mail"
      >
        <label htmlFor={`${formId}-email`} className="sr-only">
          Seu e-mail
        </label>
        <input
          id={`${formId}-email`}
          name="email"
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          placeholder="seu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input-field newsletter-signup-input"
          disabled={status === "loading"}
        />
        <button
          type="submit"
          className="btn-primary newsletter-signup-button"
          disabled={status === "loading"}
        >
          {status === "loading" ? "Inscrevendo..." : "Inscrever-se"}
        </button>
      </form>

      <p
        className="newsletter-signup-hint"
        aria-live="polite"
        role={status === "error" ? "alert" : "status"}
      >
        {message ??
          "Você pode cancelar a qualquer momento pelo link de descadastro nos e-mails enviados."}
      </p>
    </section>
  );
}

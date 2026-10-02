"use client";

import { useState } from "react";

import { sanitizeHtml } from "@/lib/sanitize";

interface ReportHtmlButtonProps {
  html?: string | null;
  label?: string;
  className?: string;
}

export function ReportHtmlButton({
  html,
  label = "Ver relatório HTML",
  className = "",
}: ReportHtmlButtonProps) {
  const [open, setOpen] = useState(false);

  if (!html?.trim()) return null;

  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const fragment = bodyMatch?.[1] ?? html;
  const safe = sanitizeHtml(fragment);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          className ||
          "rounded border border-ink-600 px-3 py-1.5 text-xs uppercase tracking-wider text-slate-300 hover:border-gold-500/40 hover:text-gold-200"
        }
      >
        {label}
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Relatório HTML"
        >
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded border border-ink-600 bg-ink-950 shadow-xl">
            <div className="flex items-center justify-between border-b border-ink-700 px-4 py-3">
              <h2 className="font-display text-lg text-white">Relatório do dia</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded border border-ink-600 px-2 py-1 text-xs text-slate-400 hover:text-white"
              >
                Fechar
              </button>
            </div>
            <div
              className="prose prose-invert max-w-none overflow-y-auto px-4 py-4 text-sm text-slate-300"
              dangerouslySetInnerHTML={{ __html: safe }}
            />
          </div>
        </div>
      )}
    </>
  );
}

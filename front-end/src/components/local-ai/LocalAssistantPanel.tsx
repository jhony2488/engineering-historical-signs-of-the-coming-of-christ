"use client";

import { useEffect, useRef, useState } from "react";

import { useLocalAI } from "@/hooks/useLocalAI";
import { LOCAL_AI_DISCLAIMER, perguntaPrompt } from "@/lib/local-ai/summaries";
import type { ResultadoEscatologico } from "@/lib/types";

interface LocalAssistantPanelProps {
  contexto: ResultadoEscatologico | null;
}

interface ChatTurn {
  role: "user" | "assistant";
  text: string;
}

/** Assistente flutuante — perguntas sobre os dados do painel. */
export function LocalAssistantPanel({ contexto }: LocalAssistantPanelProps) {
  const { status, modelLabel } = useLocalAI();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [generating, setGenerating] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [turns]);

  if (status !== "ready" || !contexto) return null;

  const ask = async () => {
    const pergunta = input.trim();
    if (!pergunta || generating) return;
    setInput("");
    setGenerating(true);
    setTurns((t) => [...t, { role: "user", text: pergunta }, { role: "assistant", text: "" }]);
    try {
      const engine = (await import("@/lib/local-ai/engine")).getLocalAiEngine();
      let acc = "";
      const out = await engine.generate(
        { messages: perguntaPrompt(contexto, pergunta), maxNewTokens: 256 },
        (token) => {
          acc += token;
          setTurns((t) => {
            const next = [...t];
            next[next.length - 1] = { role: "assistant", text: acc };
            return next;
          });
        },
      );
      const finalText = out.trim() || acc.trim();
      setTurns((t) => {
        const next = [...t];
        next[next.length - 1] = { role: "assistant", text: finalText || "Sem resposta." };
        return next;
      });
    } catch {
      setTurns((t) => {
        const next = [...t];
        next[next.length - 1] = {
          role: "assistant",
          text: "Falha ao gerar resposta local.",
        };
        return next;
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="local-assistant-panel"
        aria-label={open ? "Fechar assistente" : "Abrir assistente"}
        className="fixed bottom-4 right-4 z-50 flex h-11 w-11 items-center justify-center rounded-full border border-violet-500/40 bg-ink-900/95 text-violet-300 shadow-lg backdrop-blur transition hover:border-violet-400"
      >
        <span aria-hidden="true" className="text-lg">{open ? "×" : "✦"}</span>
      </button>

      {open && (
        <div
          id="local-assistant-panel"
          role="dialog"
          aria-label="Assistente"
          className="fixed bottom-16 right-4 z-50 flex h-96 w-80 flex-col rounded-lg border border-ink-700 bg-ink-900/95 shadow-xl backdrop-blur"
        >
          <header className="border-b border-ink-700 px-3 py-2">
            <p className="text-xs font-medium text-violet-300">Assistente</p>
            <p className="text-[10px] text-slate-500">
              {modelLabel ?? "IA"} · perguntas sobre os dados do painel
            </p>
          </header>
          <div ref={listRef} className="flex-1 space-y-2 overflow-y-auto p-3">
            {turns.length === 0 && (
              <p className="text-xs text-slate-500">
                Pergunte sobre a fase, índices ou candidatos do dia.
              </p>
            )}
            {turns.map((turn, i) => (
              <p
                key={i}
                className={
                  turn.role === "user"
                    ? "ml-auto max-w-[85%] rounded-lg bg-violet-500/15 px-2 py-1 text-xs text-violet-200"
                    : "mr-auto max-w-[90%] rounded-lg bg-ink-800 px-2 py-1 text-xs text-slate-300"
                }
              >
                {turn.text || (generating && i === turns.length - 1 ? "…" : turn.text)}
              </p>
            ))}
          </div>
          <form
            className="flex gap-2 border-t border-ink-700 p-2"
            onSubmit={(e) => {
              e.preventDefault();
              void ask();
            }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Pergunta sobre o painel…"
              aria-label="Pergunta para o assistente"
              className="min-w-0 flex-1 rounded border border-ink-700 bg-ink-800 px-2 py-1 text-xs text-slate-200 placeholder:text-slate-600 focus:border-violet-500/50 focus:outline-none"
            />
            <button
              type="submit"
              disabled={generating || !input.trim()}
              className="rounded bg-violet-500/20 px-2 py-1 text-xs text-violet-300 hover:bg-violet-500/30 disabled:opacity-40"
            >
              Enviar
            </button>
          </form>
          <p className="px-3 pb-2 text-[10px] text-slate-600">{LOCAL_AI_DISCLAIMER}</p>
        </div>
      )}
    </>
  );
}

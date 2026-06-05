"use client";

import { useEffect, useRef } from "react";

const STORAGE_KEY = "bg_audio_last_played";
const COOLDOWN_MS = 10 * 60 * 1000; // 10 minutos

export function BackgroundAudio() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const triggeredRef = useRef(false);

  useEffect(() => {
    const audio = new Audio("/naotemas.mp3");
    audio.volume = 0.5;
    audioRef.current = audio;

    const thunder = new Audio("/strong-thunder-clap.mp3");
    thunder.volume = 0.35;

    function tryPlay() {
      if (triggeredRef.current) return;

      const lastPlayed = localStorage.getItem(STORAGE_KEY);
      const now = Date.now();

      if (lastPlayed && now - Number(lastPlayed) < COOLDOWN_MS) return;

      triggeredRef.current = true;
      localStorage.setItem(STORAGE_KEY, String(now));

      Promise.all([
        audio.play(),
        thunder.play(),
      ]).then(() => {
        window.dispatchEvent(new CustomEvent("audio-play"));
        audio.addEventListener("ended", () => window.dispatchEvent(new CustomEvent("audio-stop")), { once: true });
      }).catch(() => {
        // Navegador bloqueou — ignora silenciosamente
      });

      cleanup();
    }

    function cleanup() {
      window.removeEventListener("click", tryPlay);
      window.removeEventListener("touchstart", tryPlay);
      window.removeEventListener("keydown", tryPlay);
      window.removeEventListener("scroll", tryPlay);
    }

    window.addEventListener("click", tryPlay, { once: false, passive: true });
    window.addEventListener("touchstart", tryPlay, { once: false, passive: true });
    window.addEventListener("keydown", tryPlay, { once: false, passive: true });
    window.addEventListener("scroll", tryPlay, { once: false, passive: true });

    return () => {
      cleanup();
      audio.pause();
      thunder.pause();
    };
  }, []);

  return null;
}

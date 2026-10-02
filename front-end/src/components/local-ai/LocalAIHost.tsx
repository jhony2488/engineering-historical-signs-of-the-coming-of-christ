"use client";

import { useEffect } from "react";

import { startLocalAiEngine } from "@/hooks/useLocalAI";
import { DownloadStatusChip } from "./DownloadStatusChip";

/**
 * Montado uma vez no layout: dispara o probe de capacidade e o download
 * automático em background (ou o opt-in em conexão limitada).
 */
export function LocalAIHost() {
  useEffect(() => {
    startLocalAiEngine();
  }, []);

  return <DownloadStatusChip />;
}

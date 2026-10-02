import { NextResponse } from "next/server";

import { withRateLimit } from "@/lib/api-guard";
import { getCenariosFromDb } from "@/lib/db/grafo";
import { runWhatIfSimulation } from "@/lib/scenario-whatif";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const limited = withRateLimit(request);
  if (limited) return limited;

  let body: { ativos?: string[]; base_indice?: number; trials?: number } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  try {
    const cenarios = await getCenariosFromDb();
    const result = runWhatIfSimulation(cenarios, {
      ativos: body.ativos ?? [],
      baseIndice: body.base_indice ?? 0.58,
      trials: body.trials ?? 200,
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error("[db/cenarios/what-if]", error);
    return NextResponse.json({ error: "Erro na simulação what-if" }, { status: 500 });
  }
}

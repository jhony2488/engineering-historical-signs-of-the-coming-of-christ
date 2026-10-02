/** Baixa os modelos da IA on-device para `public/models/<slug>/` (self-host).
 *
 * Uso (a partir de `front-end/`):
 *
 *   npm run ai:download-models            # 1º candidato de cada tier
 *   npm run ai:download-models -- --all   # cascata inteira
 *   npm run ai:download-models -- --tier=c
 *   npm run ai:download-models -- --list  # status sem baixar
 *
 * A pasta public/models/ está no .gitignore — os pesos nunca são commitados.
 * Em runtime o engine prefere /models/<slug>/ (HEAD no config) e cai no
 * Hugging Face quando ausente. WebLLM adicionalmente baixa o .wasm lib
 * resolvido via prebuiltAppConfig do próprio pacote.
 */
import {
  createWriteStream,
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
} from "node:fs";
import { Readable } from "node:stream";
import { pipeline as streamPipeline } from "node:stream/promises";
import path from "node:path";

import {
  LOCAL_MODEL_TIERS,
  type LocalModelCandidate,
  type LocalModelTierId,
} from "../src/lib/local-ai/models";

const MODELS_DIR = path.join(process.cwd(), "public", "models");
const HF = "https://huggingface.co";

interface HfFile {
  type: string;
  path: string;
  size?: number;
}

async function listRepoFiles(repo: string): Promise<HfFile[]> {
  const res = await fetch(`${HF}/api/models/${repo}/tree/main?recursive=true`);
  if (!res.ok) throw new Error(`HF tree ${res.status} (${repo})`);
  const files = (await res.json()) as HfFile[];
  return files.filter((f) => f.type === "file");
}

/** onnx: só o que o transformers.js pede (root configs + onnx/model_<dtype>.*).
 *  webllm: repo MLC inteiro (shards + mlc-chat-config + tokenizer). */
function wantedFiles(c: LocalModelCandidate, files: HfFile[]): HfFile[] {
  if (c.engine === "webllm") {
    return files.filter((f) => !f.path.startsWith(".git"));
  }
  return files.filter((f) => {
    if (!f.path.includes("/")) return true; // config.json, tokenizer*, etc.
    if (!f.path.startsWith("onnx/")) return false;
    const base = f.path.split("/").pop() ?? "";
    return base === `model_${c.dtype}.onnx` || base === `model_${c.dtype}.onnx_data`;
  });
}

async function downloadFile(repo: string, remotePath: string, dest: string): Promise<void> {
  if (existsSync(dest)) {
    process.stdout.write(`[skip] ${remotePath}\n`);
    return;
  }
  mkdirSync(path.dirname(dest), { recursive: true });
  const res = await fetch(`${HF}/${repo}/resolve/main/${remotePath}`);
  if (!res.ok || !res.body) throw new Error(`download ${res.status}: ${remotePath}`);
  await streamPipeline(Readable.fromWeb(res.body as never), createWriteStream(dest));
  process.stdout.write(`[done] ${remotePath}\n`);
}

/** webllm: .wasm do model lib vem do prebuiltAppConfig do pacote. */
async function downloadMlcWasm(c: LocalModelCandidate, destDir: string): Promise<void> {
  if (!c.wasmLib) return;
  const dest = path.join(destDir, c.wasmLib);
  if (existsSync(dest)) {
    process.stdout.write(`[skip] ${c.wasmLib}\n`);
    return;
  }
  const { prebuiltAppConfig } = await import("@mlc-ai/web-llm");
  const entry = prebuiltAppConfig.model_list.find(
    (m) => m.model_id === c.modelId,
  );
  if (!entry?.model_lib) {
    process.stdout.write(`[warn] model_lib não encontrado p/ ${c.modelId}\n`);
    return;
  }
  const res = await fetch(entry.model_lib);
  if (!res.ok || !res.body) throw new Error(`wasm ${res.status}: ${entry.model_lib}`);
  mkdirSync(destDir, { recursive: true });
  await streamPipeline(Readable.fromWeb(res.body as never), createWriteStream(dest));
  process.stdout.write(`[done] ${c.wasmLib}\n`);
}

function dirSizeMb(dir: string): number {
  if (!existsSync(dir)) return 0;
  let total = 0;
  const walk = (d: string) => {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, entry.name);
      if (entry.isDirectory()) walk(p);
      else total += statSync(p).size;
    }
  };
  walk(dir);
  return total / (1024 * 1024);
}

async function main(): Promise<number> {
  const args = process.argv.slice(2);
  const tierArg = args.find((a) => a.startsWith("--tier="))?.split("=")[1] as
    | LocalModelTierId
    | undefined;
  const listOnly = args.includes("--list");
  const all = args.includes("--all");

  const tiers = tierArg ? [LOCAL_MODEL_TIERS[tierArg]] : Object.values(LOCAL_MODEL_TIERS);
  const candidates = tiers.flatMap((t) =>
    all ? t.candidates : t.candidates.slice(0, 1),
  );

  if (listOnly) {
    for (const c of candidates) {
      const dir = path.join(MODELS_DIR, c.slug);
      const mb = dirSizeMb(dir);
      const mark = existsSync(dir) ? "ok" : "--";
      process.stdout.write(
        `[${mark}] ${c.slug}  (${c.engine}, ${c.label}, ${mb.toFixed(0)} MB locais)\n`,
      );
    }
    return 0;
  }

  for (const c of candidates) {
    const dir = path.join(MODELS_DIR, c.slug);
    process.stdout.write(`\n→ ${c.label} (${c.hfRepo}) → public/models/${c.slug}/\n`);
    try {
      const files = wantedFiles(c, await listRepoFiles(c.hfRepo));
      for (const f of files) {
        await downloadFile(c.hfRepo, f.path, path.join(dir, f.path));
      }
      if (c.engine === "webllm") await downloadMlcWasm(c, dir);
      process.stdout.write(`✓ ${c.slug} pronto (${dirSizeMb(dir).toFixed(0)} MB)\n`);
    } catch (err) {
      process.stdout.write(
        `✗ ${c.slug}: ${err instanceof Error ? err.message : String(err)}\n`,
      );
    }
  }
  return 0;
}

void main();

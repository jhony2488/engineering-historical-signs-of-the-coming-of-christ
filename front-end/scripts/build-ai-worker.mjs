/** Pré-bundla o worker da IA on-device para public/local-ai.worker.js.
 *
 *  `new Worker(new URL(...))` quebraria o build server do Next (compilação
 *  "browser" extra). Bundlar via esbuild isola o peso (web-llm/transformers)
 *  fora do bundle do app — o arquivo só é baixado quando a feature ativa.
 *
 *  Roda automaticamente antes de `npm run dev`/`npm run build`.
 */
import { build } from "esbuild";
import path from "node:path";

const OUT = path.join(process.cwd(), "public", "local-ai.worker.js");

await build({
  entryPoints: [path.join(process.cwd(), "src/lib/local-ai/local-ai.worker.ts")],
  outfile: OUT,
  bundle: true,
  format: "esm",
  target: "es2022",
  platform: "browser",
  minify: true,
  sourcemap: false,
  // GPU/WebNN são APIs do browser — externas não existem; nada a marcar.
  logLevel: "warning",
});

console.log("→ public/local-ai.worker.js");

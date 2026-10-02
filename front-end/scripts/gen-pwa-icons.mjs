/** Gera os ícones PNG do PWA a partir de public/favicon.svg.
 *
 *   node scripts/gen-pwa-icons.mjs
 *
 * Produz public/icons/icon-192.png, icon-512.png e maskable-512.png
 * (maskable com safe-zone de ~80% sobre o fundo #0a0c10).
 */
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";

import sharp from "sharp";

const PUBLIC = path.join(process.cwd(), "public");
const SRC = path.join(PUBLIC, "favicon.svg");
const OUT = path.join(PUBLIC, "icons");
const BG = "#0a0c10";

async function main() {
  if (!existsSync(SRC)) {
    console.error("favicon.svg não encontrado em public/");
    process.exit(1);
  }
  mkdirSync(OUT, { recursive: true });
  const svg = readFileSync(SRC);

  for (const size of [192, 512]) {
    await sharp(svg, { density: 400 })
      .resize(size, size)
      .flatten({ background: BG })
      .png()
      .toFile(path.join(OUT, `icon-${size}.png`));
    console.log(`icon-${size}.png`);
  }

  // Maskable: ícone a 60% centrado sobre fundo sólido (safe zone).
  const size = 512;
  const inner = Math.round(size * 0.6);
  const fg = await sharp(svg, { density: 400 }).resize(inner, inner).png().toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: BG } })
    .composite([{ input: fg, gravity: "center" }])
    .png()
    .toFile(path.join(OUT, "maskable-512.png"));
  console.log("maskable-512.png");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

import { SPLINE_SCENE_PATH } from "./constants";

/**
 * URL da cena para @splinetool/react-spline.
 *
 * O runtime NÃO carrega `.spline` (arquivo do editor). Use:
 * - `NEXT_PUBLIC_SPLINE_SCENE_URL` — URL do export Code (prod.spline.design/.../scene.splinecode)
 * - ou `public/*.splinecode` — baixado no painel Export → Code → React
 */
export function resolveSplineSceneUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SPLINE_SCENE_URL?.trim();
  const path = fromEnv || SPLINE_SCENE_PATH;

  if (!path) {
    return "/biblically_accurate_angel_eyes_and_rings.spline";
  }

  if (typeof window !== "undefined" && path.startsWith("/")) {
    return `${window.location.origin}${path}`;
  }

  return path;
}

/** `.spline` é formato de editor; só `.splinecode` (ou URL prod.spline.design) funciona no site. */
export function isSplineRuntimeSceneUrl(url: string): boolean {
  const normalized = url.split("?")[0].toLowerCase();
  if (normalized.endsWith(".splinecode")) return true;
  if (normalized.includes("prod.spline.design") || normalized.includes("spline.design")) {
    return true;
  }
  if (normalized.endsWith(".spline")) return false;
  return true;
}

import {
  ARC_BULGE_PX,
  MARGIN_X,
  SCENE_SIZE,
} from "./constants";

export type Point = { x: number; y: number };
export type LateralSide = "left" | "right";
export type SceneSize = { width: number; height: number };

export function clampPoint(point: Point, size: SceneSize = SCENE_SIZE): Point {
  const maxX = Math.max(MARGIN_X, window.innerWidth - size.width - MARGIN_X);
  const maxY = Math.max(MARGIN_X, window.innerHeight - size.height - MARGIN_X);
  return {
    x: Math.min(Math.max(point.x, MARGIN_X), maxX),
    y: Math.min(Math.max(point.y, MARGIN_X), maxY),
  };
}

export function lateralPoint(side: LateralSide, size: SceneSize = SCENE_SIZE): Point {
  const y = Math.max(MARGIN_X, (window.innerHeight - size.height) / 2);
  const x = side === "left" ? MARGIN_X : window.innerWidth - size.width - MARGIN_X;
  return clampPoint({ x, y }, size);
}

export function footerCenterPoint(size: SceneSize = SCENE_SIZE): Point {
  const footer = document.querySelector<HTMLElement>("[data-site-footer]");
  if (footer) {
    const rect = footer.getBoundingClientRect();
    return clampPoint(
      {
        x: (window.innerWidth - size.width) / 2,
        y: rect.top + rect.height / 2 - size.height / 2,
      },
      size,
    );
  }
  return clampPoint(
    {
      x: (window.innerWidth - size.width) / 2,
      y: window.innerHeight - 72 - size.height / 2,
    },
    size,
  );
}

/** Interpolação em arco (bezier quadrática) entre dois pontos. */
export function arcPoint(t: number, from: Point, to: Point): Point {
  const clamped = Math.min(1, Math.max(0, t));
  const cx = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2;
  const cy = midY - ARC_BULGE_PX;
  const u = 1 - clamped;
  return {
    x: u * u * from.x + 2 * u * clamped * cx + clamped * clamped * to.x,
    y: u * u * from.y + 2 * u * clamped * cy + clamped * clamped * to.y,
  };
}

export function pointFromMouse(clientX: number, clientY: number, size: SceneSize = SCENE_SIZE): Point {
  return clampPoint(
    {
      x: clientX - size.width / 2,
      y: clientY - size.height / 2,
    },
    size,
  );
}

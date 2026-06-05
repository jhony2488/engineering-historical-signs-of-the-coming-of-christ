export const SPLINE_SCENE_PATH = "/biblically_accurate_angel_eyes_and_rings.spline";

export const SCENE_SIZE = { width: 260, height: 340 } as const;

export const MARGIN_X = 20;

/** Distância de scroll acumulada para completar o arco até o centro do footer. */
export const SCROLL_DISTANCE_FOR_CENTER = 300;

/** Tempo sem scroll para considerar que o usuário parou. */
export const SCROLL_STOP_DELAY_MS = 200;

/** Duplo clique: tempo na posição do mouse antes de voltar à lateral. */
export const PIN_DURATION_MS = 10_000;

/** Curvatura do movimento circular (bezier) entre lateral e footer. */
export const ARC_BULGE_PX = 130;

export const HIDDEN_ROUTE_PREFIXES = [
  "/login",
  "/historico",
  "/simulador",
  "/grafo",
  "/insights",
  "/revisao",
] as const;

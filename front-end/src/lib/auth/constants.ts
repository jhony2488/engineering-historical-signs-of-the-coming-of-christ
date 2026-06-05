/** Rotas que exigem sessão administrativa (ações / arquivo completo). */
export const PRIVATE_PAGE_PREFIXES = [
  "/historico",
  "/simulador",
  "/grafo",
  "/insights",
  "/revisao",
  "/newsletter",
] as const;

/** APIs restritas — snapshots, grafo, cenários, PDF e admin. */
export const PRIVATE_API_PREFIXES = [
  "/api/db/snapshot",
  "/api/db/grafo",
  "/api/db/cenarios",
  "/api/db/relatorio",
  "/api/admin",
] as const;

export const SESSION_COOKIE = "sinais_admin_session";
export const SESSION_MAX_AGE_SEC = 60 * 60 * 8; // 8 horas

export function isPrivatePage(pathname: string): boolean {
  return PRIVATE_PAGE_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export function isPrivateApi(pathname: string): boolean {
  return PRIVATE_API_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export function safeRedirectPath(from: string | null): string {
  if (!from || !from.startsWith("/") || from.startsWith("//")) {
    return "/historico";
  }
  if (from === "/login") {
    return "/historico";
  }
  if (!isPrivatePage(from)) {
    return "/historico";
  }
  return from;
}

import { checkRateLimit, clientIp, rateLimitResponse } from "./rate-limit";

export function withRateLimit(request: Request): Response | null {
  const ip = clientIp(request);
  const { allowed, retryAfterSec } = checkRateLimit(`api-db:${ip}`);
  if (!allowed && retryAfterSec) {
    return rateLimitResponse(retryAfterSec);
  }
  return null;
}

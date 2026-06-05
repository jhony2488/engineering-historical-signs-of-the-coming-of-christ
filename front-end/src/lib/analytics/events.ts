import { getGaMeasurementId } from "./config";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackEvent(
  name: string,
  params?: Record<string, string | number | boolean>,
): void {
  if (typeof window === "undefined" || !getGaMeasurementId()) return;
  window.gtag?.("event", name, params);
}

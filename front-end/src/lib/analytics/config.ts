/** Rotas públicas onde o Google Analytics 4 (gratuito) deve rastrear page views. */
export const PUBLIC_ANALYTICS_PATHS = ["/", "/rankings"] as const;

export function getGaMeasurementId(): string | undefined {
  const id = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();
  return id && id.startsWith("G-") ? id : undefined;
}

export function isPublicAnalyticsPath(pathname: string): boolean {
  if (pathname === "/login") return false;
  return (
    pathname === "/" ||
    pathname === "/rankings" ||
    pathname.startsWith("/rankings/")
  );
}

export function isGaDataApiConfigured(): boolean {
  const propertyId = process.env.GA_PROPERTY_ID?.trim();
  const email = process.env.GA_CLIENT_EMAIL?.trim();
  const key = process.env.GA_PRIVATE_KEY?.trim();
  return Boolean(propertyId && email && key);
}

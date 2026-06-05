"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { getGaMeasurementId, isPublicAnalyticsPath } from "@/lib/analytics/config";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

export function GoogleAnalytics() {
  const pathname = usePathname();
  const measurementId = getGaMeasurementId();
  const trackable = Boolean(measurementId && isPublicAnalyticsPath(pathname));

  useEffect(() => {
    if (!trackable || !measurementId) return;
    window.gtag?.("config", measurementId, { page_path: pathname });
  }, [pathname, measurementId, trackable]);

  if (!measurementId || !trackable) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${measurementId}', { send_page_view: false });
        `}
      </Script>
    </>
  );
}

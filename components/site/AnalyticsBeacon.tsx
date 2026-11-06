"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { normalizePublicPath } from "@/lib/analytics/path";

const VID = "sp_vid";

/** Seconds until the next Asia/Tehran midnight, so the visitor cookie is not a permanent id. */
function secondsUntilTehranMidnight(now = new Date()): number {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tehran",
    hourCycle: "h23",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = Object.fromEntries(fmt.formatToParts(now).map((p) => [p.type, p.value]));
  const elapsed = (Number(parts.hour) % 24) * 3600 + Number(parts.minute) * 60 + Number(parts.second);
  return Math.max(60, 86400 - elapsed);
}

function ensureVisitorCookie() {
  const current = document.cookie.split(/; */).find((p) => p.startsWith(`${VID}=`));
  const value = current ? decodeURIComponent(current.slice(VID.length + 1)) : "";
  if (/^[A-Za-z0-9_-]{16,40}$/.test(value)) return;
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  const vid = btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${VID}=${vid}; Path=/; Max-Age=${secondsUntilTehranMidnight()}; SameSite=Lax${secure}`;
}

/** Records a public page view. Skips token and payment URLs before anything is sent. */
export function AnalyticsBeacon() {
  const pathname = usePathname();
  const search = useSearchParams();
  const utmSource = search.get("utm_source") ?? "";
  const utmMedium = search.get("utm_medium") ?? "";
  const utmCampaign = search.get("utm_campaign") ?? "";
  const last = useRef("");

  useEffect(() => {
    const path = normalizePublicPath(pathname);
    if (!path) return;
    const key = `${path}\n${utmSource}\n${utmMedium}\n${utmCampaign}`;
    if (last.current === key) return;
    last.current = key;
    if (navigator.webdriver) return;
    ensureVisitorCookie();
    const ctrl = new AbortController();
    const timer = window.setTimeout(() => ctrl.abort(), 4000);
    fetch("/api/analytics", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      keepalive: true,
      signal: ctrl.signal,
      body: JSON.stringify({
        path,
        ref: document.referrer || "",
        utm_source: utmSource,
        utm_medium: utmMedium,
        utm_campaign: utmCampaign,
      }),
    })
      .catch(() => undefined)
      .finally(() => window.clearTimeout(timer));
  }, [pathname, utmSource, utmMedium, utmCampaign]);

  return null;
}

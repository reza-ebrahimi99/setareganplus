import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { siteUrl } from "@/lib/shop/config";

/** IndexNow key lives in the Setting table (generated once, no env var). */
export async function getIndexNowKey(): Promise<string> {
  const row = await prisma.setting.findUnique({ where: { key: "indexnow" } });
  const v = row?.value as { key?: string } | undefined;
  if (v?.key && /^[a-f0-9]{32}$/.test(v.key)) return v.key;
  const key = randomBytes(16).toString("hex");
  await prisma.setting.upsert({ where: { key: "indexnow" }, create: { key: "indexnow", value: { key } }, update: { value: { key } } });
  return key;
}

/**
 * Tell Bing/Yandex/Seznam/Naver (IndexNow) that pages changed. Fire-and-forget:
 * never throws, never blocks the admin save, skipped for localhost / non-https.
 */
export function pingIndexNow(paths: string[]): void {
  const site = siteUrl();
  if (!/^https:\/\//.test(site) || /localhost|127\.0\.0\.1/.test(site) || paths.length === 0) return;
  void (async () => {
    try {
      const key = await getIndexNowKey();
      const host = new URL(site).host;
      await fetch("https://api.indexnow.org/indexnow", {
        method: "POST",
        headers: { "content-type": "application/json; charset=utf-8" },
        body: JSON.stringify({ host, key, keyLocation: `${site}/indexnow-key.txt`, urlList: paths.map((p) => site + encodeURI(p)) }),
        signal: AbortSignal.timeout(5000),
      });
    } catch {
      /* offline / filtered: search engines will still find it via sitemap */
    }
  })();
}

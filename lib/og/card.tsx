import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { visual } from "./reshape";

export const OG_SIZE = { width: 1200, height: 630 };

let fonts: Promise<{ name: string; data: Buffer; weight: 500 | 800; style: "normal" }[]> | null = null;
function loadFonts() {
  fonts ??= Promise.all([
    readFile(path.join(process.cwd(), "lib/og/Vazirmatn-ExtraBold.ttf")).then((data) => ({ name: "Vazirmatn", data, weight: 800 as const, style: "normal" as const })),
    readFile(path.join(process.cwd(), "lib/og/Vazirmatn-Medium.ttf")).then((data) => ({ name: "Vazirmatn", data, weight: 500 as const, style: "normal" as const })),
  ]);
  return fonts;
}
let logo: Promise<string> | null = null;
const loadLogo = () => (logo ??= readFile(path.join(process.cwd(), "public/brand/logo.png")).then((b) => `data:image/png;base64,${b.toString("base64")}`));

/**
 * Satori measures Arabic-script text unshaped (too wide) and lays runs out
 * left-to-right. We pre-shape each word to presentation forms in visual order
 * (lib/og/reshape) and flow the words right-to-left ourselves.
 */
function Fa({ text, size, color, weight = 800, lh = 1.5 }: { text: string; size: number; color: string; weight?: 500 | 800; lh?: number }) {
  const words = text.trim().split(/\s+/);
  return (
    <div style={{ display: "flex", flexDirection: "row-reverse", flexWrap: "wrap", fontSize: size, color, fontWeight: weight, lineHeight: lh }}>
      {words.map((w, i) => (
        <span key={i} style={{ marginLeft: i === words.length - 1 ? 0 : size * 0.28 }}>{visual(w)}</span>
      ))}
    </div>
  );
}

export async function ogCard({ kicker, title, foot }: { kicker?: string; title: string; foot?: string }) {
  const [f, src] = await Promise.all([loadFonts(), loadLogo()]);
  const t = title.length > 70 ? title.slice(0, 68) + "…" : title;
  const size = t.length > 45 ? 54 : t.length > 26 ? 64 : 76;
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: "linear-gradient(135deg, #0B1F3A 0%, #13306b 60%, #1d4ed8 120%)", fontFamily: "Vazirmatn", padding: 64, position: "relative" }}>
        <div style={{ position: "absolute", left: -120, top: -140, width: 520, height: 520, borderRadius: 9999, background: "radial-gradient(circle at center, rgba(245,181,30,0.30) 0%, rgba(245,181,30,0) 70%)" }} />
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: "100%", height: "100%" }}>
          <div style={{ display: "flex", flexDirection: "row-reverse", alignItems: "center", gap: 22 }}>
            <div style={{ display: "flex", background: "white", borderRadius: 28, padding: 12, width: 104, height: 104, alignItems: "center", justifyContent: "center" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} width={80} height={67} alt="" />
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
              <Fa text="ستارگان پلاس" size={40} color="#ffffff" />
              <Fa text="مؤسسه علمی ستارگان · نسیم‌شهر" size={24} color="rgba(255,255,255,0.7)" weight={500} />
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 14 }}>
            {kicker && (
              <div style={{ display: "flex", background: "#F5B51E", borderRadius: 999, padding: "6px 22px" }}>
                <Fa text={kicker} size={26} color="#0B1F3A" />
              </div>
            )}
            <div style={{ display: "flex", width: "100%", justifyContent: "flex-end" }}>
              <Fa text={t} size={size} color="#ffffff" lh={1.45} />
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", borderTop: "2px solid rgba(255,255,255,0.15)", paddingTop: 22 }}>
            <Fa text={foot ?? "آموزشگاه تقویتی و کنکور · نمایندگی قلم‌چی · فروشگاه جزوه"} size={24} color="rgba(255,255,255,0.8)" weight={500} />
            <span style={{ fontSize: 26, color: "#F5B51E", fontWeight: 800 }}>setareganplus.ir</span>
          </div>
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts: await f },
  );
}

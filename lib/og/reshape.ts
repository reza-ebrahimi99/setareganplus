/**
 * Minimal Persian/Arabic reshaper for Satori (next/og). Satori measures text
 * with unshaped glyph widths, which leaves gaps in RTL words. Converting to
 * Arabic Presentation Forms makes measured width == drawn width.
 * Forms: [isolated, final, initial, medial]; two entries = right-joining only.
 */
const F: Record<string, number[]> = {
  "\u0622": [0xfe81, 0xfe82], "\u0623": [0xfe83, 0xfe84], "\u0624": [0xfe85, 0xfe86], "\u0625": [0xfe87, 0xfe88],
  "\u0626": [0xfe89, 0xfe8a, 0xfe8b, 0xfe8c], "\u0627": [0xfe8d, 0xfe8e], "\u0628": [0xfe8f, 0xfe90, 0xfe91, 0xfe92],
  "\u0629": [0xfe93, 0xfe94], "\u062a": [0xfe95, 0xfe96, 0xfe97, 0xfe98], "\u062b": [0xfe99, 0xfe9a, 0xfe9b, 0xfe9c],
  "\u062c": [0xfe9d, 0xfe9e, 0xfe9f, 0xfea0], "\u062d": [0xfea1, 0xfea2, 0xfea3, 0xfea4], "\u062e": [0xfea5, 0xfea6, 0xfea7, 0xfea8],
  "\u062f": [0xfea9, 0xfeaa], "\u0630": [0xfeab, 0xfeac], "\u0631": [0xfead, 0xfeae], "\u0632": [0xfeaf, 0xfeb0],
  "\u0633": [0xfeb1, 0xfeb2, 0xfeb3, 0xfeb4], "\u0634": [0xfeb5, 0xfeb6, 0xfeb7, 0xfeb8], "\u0635": [0xfeb9, 0xfeba, 0xfebb, 0xfebc],
  "\u0636": [0xfebd, 0xfebe, 0xfebf, 0xfec0], "\u0637": [0xfec1, 0xfec2, 0xfec3, 0xfec4], "\u0638": [0xfec5, 0xfec6, 0xfec7, 0xfec8],
  "\u0639": [0xfec9, 0xfeca, 0xfecb, 0xfecc], "\u063a": [0xfecd, 0xfece, 0xfecf, 0xfed0], "\u0641": [0xfed1, 0xfed2, 0xfed3, 0xfed4],
  "\u0642": [0xfed5, 0xfed6, 0xfed7, 0xfed8], "\u0643": [0xfed9, 0xfeda, 0xfedb, 0xfedc], "\u0644": [0xfedd, 0xfede, 0xfedf, 0xfee0],
  "\u0645": [0xfee1, 0xfee2, 0xfee3, 0xfee4], "\u0646": [0xfee5, 0xfee6, 0xfee7, 0xfee8], "\u0647": [0xfee9, 0xfeea, 0xfeeb, 0xfeec],
  "\u0648": [0xfeed, 0xfeee], "\u0649": [0xfeef, 0xfef0], "\u064a": [0xfef1, 0xfef2, 0xfef3, 0xfef4],
  "\u067e": [0xfb56, 0xfb57, 0xfb58, 0xfb59], "\u0686": [0xfb7a, 0xfb7b, 0xfb7c, 0xfb7d], "\u0698": [0xfb8a, 0xfb8b],
  "\u06a9": [0xfb8e, 0xfb8f, 0xfb90, 0xfb91], "\u06af": [0xfb92, 0xfb93, 0xfb94, 0xfb95], "\u06cc": [0xfbfc, 0xfbfd, 0xfbfe, 0xfbff],
  "\u0640": [0x640, 0x640, 0x640, 0x640],
};
const LAM_ALEF: Record<string, [number, number]> = { "\u0627": [0xfefb, 0xfefc], "\u0622": [0xfef5, 0xfef6], "\u0623": [0xfef7, 0xfef8], "\u0625": [0xfef9, 0xfefa] };
const transparent = (c: string) => /[\u064b-\u0652\u0670]/.test(c);

export function reshape(word: string): string {
  const ch = [...word];
  const out: string[] = [];
  const prevJoins = (i: number) => {
    for (let j = i - 1; j >= 0; j--) {
      if (transparent(ch[j])) continue;
      return (F[ch[j]]?.length ?? 0) === 4;
    }
    return false;
  };
  const nextIs = (i: number) => {
    for (let j = i + 1; j < ch.length; j++) if (!transparent(ch[j])) return j;
    return -1;
  };
  for (let i = 0; i < ch.length; i++) {
    const c = ch[i];
    if (c === "\u200c") continue; // ZWNJ: already broke the join, drop it
    const f = F[c];
    if (!f) { out.push(c); continue; }
    const p = prevJoins(i);
    const ni = nextIs(i);
    if (c === "\u0644" && ni >= 0 && LAM_ALEF[ch[ni]]) {
      out.push(String.fromCodePoint(LAM_ALEF[ch[ni]][p ? 1 : 0]));
      i = ni;
      continue;
    }
    const n = f.length === 4 && ni >= 0 && !!F[ch[ni]];
    out.push(String.fromCodePoint(f.length === 2 ? f[p ? 1 : 0] : p && n ? f[3] : p ? f[1] : n ? f[2] : f[0]));
  }
  return out.join("");
}

/** Shape + put in visual (left-to-right) order; digit/latin runs keep their order. */
export function visual(word: string): string {
  const segs = reshape(word).match(/[0-9\u06f0-\u06f9\u0660-\u0669A-Za-z.:/\-]+|[^0-9\u06f0-\u06f9\u0660-\u0669A-Za-z.:/\-]+/g) ?? [];
  const MIRROR: Record<string, string> = { "(": ")", ")": "(", "[": "]", "]": "[", "«": "»", "»": "«", "<": ">", ">": "<", "{": "}", "}": "{" };
  return segs.reverse().map((s) => (/^[0-9\u06f0-\u06f9\u0660-\u0669A-Za-z.:/\-]+$/.test(s) ? s : [...s].reverse().map((c) => MIRROR[c] ?? c).join(""))).join("");
}

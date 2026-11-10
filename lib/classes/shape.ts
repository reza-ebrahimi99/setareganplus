/** Join Persian letters into Arabic presentation forms and flip the line for LTR drawing. */
const FORMS: Record<string, [string, string, string, string]> = {
  آ: ["ﺁ", "ﺂ", "ﺁ", "ﺂ"],
  ا: ["ﺍ", "ﺎ", "ﺍ", "ﺎ"],
  ب: ["ﺏ", "ﺐ", "ﺑ", "ﺒ"],
  پ: ["ﭖ", "ﭗ", "ﭘ", "ﭙ"],
  ت: ["ﺕ", "ﺖ", "ﺗ", "ﺘ"],
  ث: ["ﺙ", "ﺚ", "ﺛ", "ﺜ"],
  ج: ["ﺝ", "ﺞ", "ﺟ", "ﺠ"],
  چ: ["ﭺ", "ﭻ", "ﭼ", "ﭽ"],
  ح: ["ﺡ", "ﺢ", "ﺣ", "ﺤ"],
  خ: ["ﺥ", "ﺦ", "ﺧ", "ﺨ"],
  د: ["ﺩ", "ﺪ", "ﺩ", "ﺪ"],
  ذ: ["ﺫ", "ﺬ", "ﺫ", "ﺬ"],
  ر: ["ﺭ", "ﺮ", "ﺭ", "ﺮ"],
  ز: ["ﺯ", "ﺰ", "ﺯ", "ﺰ"],
  ژ: ["ﮊ", "ﮋ", "ﮊ", "ﮋ"],
  س: ["ﺱ", "ﺲ", "ﺳ", "ﺴ"],
  ش: ["ﺵ", "ﺶ", "ﺷ", "ﺸ"],
  ص: ["ﺹ", "ﺺ", "ﺻ", "ﺼ"],
  ض: ["ﺽ", "ﺾ", "ﺿ", "ﻀ"],
  ط: ["ﻁ", "ﻂ", "ﻃ", "ﻄ"],
  ظ: ["ﻅ", "ﻆ", "ﻇ", "ﻈ"],
  ع: ["ﻉ", "ﻊ", "ﻋ", "ﻌ"],
  غ: ["ﻍ", "ﻎ", "ﻏ", "ﻐ"],
  ف: ["ﻑ", "ﻒ", "ﻓ", "ﻔ"],
  ق: ["ﻕ", "ﻖ", "ﻗ", "ﻘ"],
  ک: ["ﮎ", "ﮏ", "ﮐ", "ﮑ"],
  ك: ["ﻙ", "ﻚ", "ﻛ", "ﻜ"],
  گ: ["ﮒ", "ﮓ", "ﮔ", "ﮕ"],
  ل: ["ﻝ", "ﻞ", "ﻟ", "ﻠ"],
  م: ["ﻡ", "ﻢ", "ﻣ", "ﻤ"],
  ن: ["ﻥ", "ﻦ", "ﻧ", "ﻨ"],
  و: ["ﻭ", "ﻮ", "ﻭ", "ﻮ"],
  ه: ["ﻩ", "ﻪ", "ﻫ", "ﻬ"],
  ی: ["ﯼ", "ﯽ", "ﯾ", "ﯿ"],
  ي: ["ﻱ", "ﻲ", "ﻳ", "ﻴ"],
  ئ: ["ﺉ", "ﺊ", "ﺋ", "ﺌ"],
};

const BREAKS = new Set(["آ", "ا", "د", "ذ", "ر", "ز", "ژ", "و", "ء"]);

function shape(input: string) {
  const chars = [...input.normalize("NFC")];
  const out: string[] = [];
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    const forms = FORMS[ch];
    if (!forms) {
      out.push(ch);
      continue;
    }
    const prev = chars[i - 1];
    const next = chars[i + 1];
    const prevJoins = !!prev && !!FORMS[prev] && !BREAKS.has(prev) && prev !== "\u200c";
    const nextJoins = !!next && !!FORMS[next] && !BREAKS.has(ch) && ch !== "\u200c";
    const form = prevJoins && nextJoins ? 3 : prevJoins ? 1 : nextJoins ? 2 : 0;
    out.push(forms[form]);
  }
  return out;
}

/** Visual order for a PDF line drawn left-to-right. Digit runs keep their order. */
export function visualRtl(input: string) {
  const chars = shape(input).reverse();
  return chars.join("").replace(/[0-9۰-۹]+/g, (m) => [...m].reverse().join(""));
}

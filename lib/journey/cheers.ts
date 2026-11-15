/** Student-facing adventure copy. Keep the forbidden test words out of these strings. */

export const LANDING_INTRO =
  "این سفر برای خودِ توست تا خودت را بهتر بشناسی. می‌خواهی ببینی کجاها قدرت داری و کدام کلیدهای قدیمی‌تر جا مانده‌اند، تا مسئله‌های ریاضی را روشن‌تر و تندتر حل کنی. اینجا کسی تو را قضاوت نمی‌کند و برگه‌ای برای سنجیدن تو در کار نیست. اگر کلیدی را جور دیگری برداری، همان یک سرنخ است تا بعداً همان جا را محکم کنی. آخر راه، نقشهٔ قدرت‌های خودت را می‌بینی. اگر خواستی، کنار هم جاهای خالی را پر می‌کنیم.";

export const LANDING_PERKS: { title: string; text: string }[] = [
  { title: "نقشه", text: "یک نقشهٔ گنج و چند ایستگاه روی راه" },
  { title: "کلید", text: "هر معما یک کلید دارد؛ اگر دیدی، بردار" },
  { title: "ستاره", text: "ستاره جمع کن و نشان‌ها را یکی‌یکی فتح کن" },
  { title: "دل", text: "کلیدِ جورنشده ستاره کم نمی‌کند" },
  { title: "گوشی", text: "حدود ده تا پانزده دقیقه، راحت با گوشی" },
];

const STATION_CHEER = [
  "این نشان مال تو شد.",
  "داری خوب پیش می‌روی.",
  "یک ستارهٔ دیگر نشست توی کیسه.",
  "ادامه بده؛ راه روشن‌تر شد.",
  "آفرین، این یکی هم فتح شد.",
  "قدم بعد سبک‌تر است.",
];

const MAP_CHEER = [
  "اولین نشان فتح شد. راه تازه باز شده.",
  "دو نشان مال توست. همین‌طور برو جلو.",
  "سه نشان را پشت سر گذاشتی. نقشه دارد جان می‌گیرد.",
  "نصف راه دیگر غریبه نیست. نشان بعدی منتظر توست.",
  "ستاره‌ها دارند جمع می‌شوند. یک نشان دیگر.",
  "نزدیک آخر راهی. نقشهٔ قدرت‌هایت آن‌طرف منتظر است.",
];

export function stationCheer(index: number) {
  return STATION_CHEER[index % STATION_CHEER.length];
}

export function mapCheer(passed: number) {
  if (passed <= 0) return "";
  return MAP_CHEER[Math.min(passed, MAP_CHEER.length) - 1];
}

export const STUDENT_COPY = [LANDING_INTRO, ...LANDING_PERKS.map((p) => p.text), ...STATION_CHEER, ...MAP_CHEER].join("\n");

/** Original study-style quiz content (Persian). Do not copy Shaarem's questions. */

export const QUIZ_PATH = "/test-motalee";
export const QUIZ_SLUG = "test-motalee";

export type ArchetypeKey = "planner" | "wave" | "crammer" | "perfectionist" | "scatter";

export type Archetype = {
  key: ArchetypeKey;
  name: string;
  emoji: string;
  tagline: string;
  description: string;
  strengths: string[];
  weakHabits: string[];
  tips: string[];
};

export const ARCHETYPES: Record<ArchetypeKey, Archetype> = {
  planner: {
    key: "planner",
    name: "برنامه‌ریز منظم",
    emoji: "🗓️",
    tagline: "با برنامه جلو می‌روی و از آشفتگی بدت می‌آید",
    description:
      "تو اهل برنامه‌ای. معمولاً می‌دانی امروز چه کار داری و دوست داری کارها را سر وقت انجام بدهی. این نظم، یکی از قوی‌ترین ابزارهای موفقیت در کنکور و مدرسه است.",
    strengths: ["ثبات در مطالعه", "مدیریت زمان خوب", "کمتر جا ماندن از برنامه کلاس و آزمون"],
    weakHabits: ["گاهی سخت‌گیری زیاد روی برنامه", "ناراحت شدن وقتی برنامه به‌هم می‌خورد"],
    tips: [
      "هر هفته ۲۰٪ برنامه را خالی بگذار تا عقب‌افتادگی‌ها را جبران کنی.",
      "یک «برنامه انعطاف‌پذیر» بنویس: سه اولویت قطعی + دو اولویت اختیاری.",
      "هر شب فقط ۵ دقیقه مرور کن که فردا از کجا شروع می‌کنی.",
      "اگر یک روز خراب شد، همان شب برنامهٔ فردا را از نو بنویس؛ نه کل هفته را.",
    ],
  },
  wave: {
    key: "wave",
    name: "انگیزه‌ای موجی",
    emoji: "🌊",
    tagline: "وقتی انرژی بگیری، مثل موتور کار می‌کنی",
    description:
      "تو با انگیزه راه می‌افتی. روزهای خوبت عالی است و می‌توانی ساعت‌ها غرق درس شوی؛ اما وقتی حال‌وهوایت پایین بیاید، شروع کردن سخت می‌شود. راز موفقیت تو ساختن عادت، نه فقط حس است.",
    strengths: ["انرژی بالا در روزهای خوب", "توانایی مطالعهٔ طولانی وقتی درگیر می‌شوی", "جذاب دیدن چالش‌های تازه"],
    weakHabits: ["وابستگی به حال‌وهوا", "شروع‌های قوی و توقف‌های ناگهانی"],
    tips: [
      "قانون «۱۰ دقیقه»: هر روز فقط ۱۰ دقیقه شروع کن؛ معمولاً بقیه خودش می‌آید.",
      "محرک‌های انگیزه را از قبل آماده کن: پلی‌لیست، میز مرتب، هدف هفتگی روی کاغذ.",
      "با یک دوست یا مشاور «حساب‌کشی کوتاه» روزانه داشته باش.",
      "هدف را کوچک و قابل‌اندازه‌گیری کن: مثلاً ۲۰ تست، نه «کل فصل».",
    ],
  },
  crammer: {
    key: "crammer",
    name: "دقیقه‌نودی",
    emoji: "⏰",
    tagline: "نزدیک آزمون ناگهان توربوش روشن می‌شود",
    description:
      "تو تحت فشار خوب کار می‌کنی و شب امتحان تمرکزت بالا می‌رود. این قدرت واقعی است؛ ولی اگر فقط به دقیقهٔ نود تکیه کنی، اضطراب و جا ماندن از مباحث عمیق اجتناب‌ناپذیر می‌شود.",
    strengths: ["تمرکز بالا زیر فشار", "سرعت عمل خوب", "انجام کار در مهلت‌های کوتاه"],
    weakHabits: ["عقب انداختن شروع", "خستگی و استرس قبل از آزمون"],
    tips: [
      "مهلت‌های مصنوعی بساز: هر فصل را ۳ روز زودتر «تمام‌شده» حساب کن.",
      "مطالعه را به بلوک‌های ۲۵ دقیقه‌ای بشکن تا شروع آسان شود.",
      "شب قبل از آزمون فقط مرور سبک؛ یادگیری سنگین را جلوتر تمام کن.",
      "یک چک‌لیست هفتگی داشته باش تا «کار مانده» را قبل از دقیقهٔ نود ببینی.",
    ],
  },
  perfectionist: {
    key: "perfectionist",
    name: "کمال‌گرا",
    emoji: "✨",
    tagline: "تا کامل نشود، راضی نمی‌شوی",
    description:
      "تو جزئیات را جدی می‌گیری و دوست داری هر مبحث را درست و تمیز بفهمی. این دقت ارزشمند است؛ فقط مواظب باش کمال‌گرایی باعث کندی، مقایسهٔ دائمی و ترس از اشتباه نشود.",
    strengths: ["دقت بالا", "یادگیری عمیق", "استاندارد کیفی خوب در پاسخ‌ها"],
    weakHabits: ["گیر کردن روی جزئیات", "ترس از شروع یا از غلط نوشتن"],
    tips: [
      "قانون ۸۰٪: وقتی ۸۰٪ فهمیدی، برو سراغ تست؛ بقیه در حل تمرین کامل می‌شود.",
      "برای هر مبحث تایمر بگذار تا در یک بخش گیر نکنی.",
      "اشتباهات را «مادهٔ اولیهٔ پیشرفت» بدان؛ دفتر غلط‌ها طلاست.",
      "هفته‌ای یک‌بار مرور سریع داشته باش، نه بازنویسی کامل همهٔ جزوه.",
    ],
  },
  scatter: {
    key: "scatter",
    name: "پراکنده‌خوان",
    emoji: "🎯",
    tagline: "از این درس به آن درس می‌پری و همه را کمی می‌خوانی",
    description:
      "کنجکاوی‌ات بالاست و دوست داری چند موضوع را با هم پیش ببری. این تنوع می‌تواند مفید باشد؛ اما بدون اولویت‌بندی، حس پیشرفت می‌آید بدون نتیجهٔ عمیق. تمرکز انتخابی، برگ برنده‌ات است.",
    strengths: ["کنجکاوی و تنوع‌طلبی", "خسته نشدن سریع از یک موضوع", "دیدن تصویر بزرگ‌تر"],
    weakHabits: ["شروع زیاد و تمام‌کردن کم", "عمق کم در مباحث کلیدی"],
    tips: [
      "هر جلسه فقط یک درس اصلی + یک درس سبک داشته باش.",
      "قانون «تمام کن بعد برو»: فصل را تا تیک نهایی نرساندی سراغ بعدی نرو.",
      "اولویت‌ها را با مشاور یا کارنامهٔ آزمون بچین، نه با حس لحظه‌ای.",
      "پایان هر روز ۳ خط بنویس: چه تمام شد، چه ماند، فردا اول چیست.",
    ],
  },
};

export type QuizOption = { text: string; scores: Partial<Record<ArchetypeKey, number>> };
export type QuizQuestion = { id: string; text: string; options: QuizOption[] };

/** 10 short behavioural questions. Each option leans toward one or two styles. */
export const QUESTIONS: QuizQuestion[] = [
  {
    id: "q1",
    text: "وقتی می‌خواهی درس بخوانی، معمولاً چطور شروع می‌کنی؟",
    options: [
      { text: "اول برنامه و اولویت‌ها را می‌نویسم، بعد شروع می‌کنم", scores: { planner: 3 } },
      { text: "صبر می‌کنم حال‌وحوصله پیدا کنم، بعد غرق می‌شوم", scores: { wave: 3 } },
      { text: "تا نزدیک آزمون صبر می‌کنم، بعد یک‌دفعه جمع می‌کنم", scores: { crammer: 3 } },
      { text: "جزوه را مرتب و کامل می‌کنم؛ تا کامل نشود راحت نیستم", scores: { perfectionist: 3 } },
    ],
  },
  {
    id: "q2",
    text: "وسط مطالعه ناگهان یادت می‌آید کار دیگری هم مانده. چه می‌کنی؟",
    options: [
      { text: "در لیست می‌نویسم و به برنامهٔ فعلی‌ام برمی‌گردم", scores: { planner: 3 } },
      { text: "اگر موضوع جدید جذاب‌تر بود، می‌پرم سراغش", scores: { scatter: 3, wave: 1 } },
      { text: "فعلاً ولش می‌کنم؛ بعداً زیر فشار جمعش می‌کنم", scores: { crammer: 3 } },
      { text: "نمی‌توانم ول کنم؛ اول همان را تمیز و درست انجام می‌دهم", scores: { perfectionist: 2, scatter: 1 } },
    ],
  },
  {
    id: "q3",
    text: "کدام جمله بیشتر به تو می‌خورد؟",
    options: [
      { text: "بدون برنامه حس می‌کنم دارم وقت تلف می‌کنم", scores: { planner: 3 } },
      { text: "با یک ویدیو یا حرف انگیزشی ناگهان توربو می‌شوم", scores: { wave: 3 } },
      { text: "بهترین کارم را شب قبل از امتحان انجام می‌دهم", scores: { crammer: 3 } },
      { text: "دوست دارم همهٔ جزئیات را بفهمم، حتی اگر طول بکشد", scores: { perfectionist: 3 } },
    ],
  },
  {
    id: "q4",
    text: "میز مطالعه‌ات معمولاً چطور است؟",
    options: [
      { text: "مرتب، با لیست کارها و کتاب‌های همان روز", scores: { planner: 2, perfectionist: 1 } },
      { text: "بستگی به حال‌وهوا دارد؛ گاهی مرتب، گاهی شلوغ", scores: { wave: 2, scatter: 1 } },
      { text: "فقط نزدیک آزمون جمع‌وجورش می‌کنم", scores: { crammer: 3 } },
      { text: "چند کتاب و جزوهٔ باز همزمان روی میز است", scores: { scatter: 3 } },
    ],
  },
  {
    id: "q5",
    text: "اگر در یک تست غلط بزنی، واکنش اولت چیست؟",
    options: [
      { text: "می‌نویسم کجا در برنامهم جایش بدهم تا جبران شود", scores: { planner: 3 } },
      { text: "مدتی بی‌حوصله می‌شوم، بعد با یک هدف جدید دوباره راه می‌افتم", scores: { wave: 3 } },
      { text: "می‌گویم اشکال ندارد، شب امتحان جمعش می‌کنم", scores: { crammer: 2, scatter: 1 } },
      { text: "تا دلیل غلط را کامل نفهمم نمی‌توانم بیخیال شوم", scores: { perfectionist: 3 } },
    ],
  },
  {
    id: "q6",
    text: "برای یک هفتهٔ عادی مطالعه، کدام تصویر به تو نزدیک‌تر است؟",
    options: [
      { text: "هر روز ساعت مشخص، با پیشرفت قابل‌اندازه‌گیری", scores: { planner: 3 } },
      { text: "دو سه روز عالی، بعد یک افت، بعد دوباره اوج", scores: { wave: 3 } },
      { text: "روزهای خلوت + یک انفجار مطالعه نزدیک آزمون", scores: { crammer: 3 } },
      { text: "چند درس موازی، بدون اتمام قطعی بعضی‌ها", scores: { scatter: 3 } },
    ],
  },
  {
    id: "q7",
    text: "وقتی یک مبحث سخت است، معمولاً…",
    options: [
      { text: "آن را به تکه‌های کوچک در برنامه می‌شکنم", scores: { planner: 3 } },
      { text: "صبر می‌کنم انرژی بیاید و همان روز حسابی کار می‌کنم", scores: { wave: 2, crammer: 1 } },
      { text: "فعلاً رد می‌شوم؛ نزدیک آزمون برمی‌گردم", scores: { crammer: 3 } },
      { text: "آن‌قدر رویش می‌مانم تا حس کنم ۱۰۰٪ شده", scores: { perfectionist: 3 } },
    ],
  },
  {
    id: "q8",
    text: "دوست داری پیشرفت را چطور ببینی؟",
    options: [
      { text: "تیک‌های روزانه روی برنامه و چک‌لیست", scores: { planner: 3 } },
      { text: "حس خوب بعد از یک جلسهٔ پُرانگیزه", scores: { wave: 3 } },
      { text: "نمره یا رتبهٔ آزمون؛ بقیه فرعی است", scores: { crammer: 2, wave: 1 } },
      { text: "جزوهٔ تمیز، خلاصهٔ کامل و بدون نقطهٔ ابهام", scores: { perfectionist: 3 } },
    ],
  },
  {
    id: "q9",
    text: "کدام عادت بیشتر اذیتت می‌کند؟",
    options: [
      { text: "به‌هم خوردن برنامه بدون جایگزین", scores: { planner: 3 } },
      { text: "افت انگیزه و شروع‌نکردن", scores: { wave: 3 } },
      { text: "انباشته شدن کارها تا لحظهٔ آخر", scores: { crammer: 2, scatter: 1 } },
      { text: "نیمه‌کاره رها کردن و پریدن بین درس‌ها", scores: { scatter: 3, perfectionist: 1 } },
    ],
  },
  {
    id: "q10",
    text: "اگر فقط یک توصیه از ستارگان بگیری، دوست داری دربارهٔ چه باشد؟",
    options: [
      { text: "چطور برنامهٔ واقع‌بینانه و قابل اجرا بچینم", scores: { planner: 3 } },
      { text: "چطور انگیزه‌ام را پایدار نگه دارم", scores: { wave: 3 } },
      { text: "چطور قبل از دقیقهٔ نود جمع‌بندی کنم", scores: { crammer: 3 } },
      { text: "چطور بدون گیر کردن در کمال‌گرایی پیش بروم", scores: { perfectionist: 2, scatter: 2 } },
    ],
  },
];

export function scoreAnswers(answers: Record<string, number>): { key: ArchetypeKey; scores: Record<ArchetypeKey, number> } {
  const scores: Record<ArchetypeKey, number> = { planner: 0, wave: 0, crammer: 0, perfectionist: 0, scatter: 0 };
  for (const q of QUESTIONS) {
    const idx = answers[q.id];
    if (typeof idx !== "number" || idx < 0 || idx >= q.options.length) continue;
    const opt = q.options[idx];
    for (const [k, v] of Object.entries(opt.scores) as [ArchetypeKey, number][]) scores[k] += v;
  }
  let best: ArchetypeKey = "planner";
  let bestV = -1;
  (Object.keys(scores) as ArchetypeKey[]).forEach((k) => {
    if (scores[k] > bestV) {
      best = k;
      bestV = scores[k];
    }
  });
  return { key: best, scores };
}

export const ARCHETYPE_LIST = Object.values(ARCHETYPES);

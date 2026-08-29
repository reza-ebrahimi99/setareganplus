/**
 * Time/season-aware greetings for آترین (UI copy only).
 */

export type AtrinGreeting = {
  id: string;
  lines: readonly string[];
};

function hourInTehran(): number {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Tehran",
      hour: "numeric",
      hour12: false,
    }).formatToParts(new Date());
    const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 12);
    return Number.isFinite(hour) ? hour : 12;
  } catch {
    return new Date().getHours();
  }
}

function monthInTehran(): number {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Tehran",
      month: "numeric",
    }).formatToParts(new Date());
    return Number(parts.find((p) => p.type === "month")?.value ?? 1);
  } catch {
    return new Date().getMonth() + 1;
  }
}

export function getAtrinGreetingSet(): AtrinGreeting[] {
  const hour = hourInTehran();
  const month = monthInTehran();

  const base: AtrinGreeting[] = [
    {
      id: "default",
      lines: [
        "سلام 👋",
        "خوش اومدی.",
        "از کجا شروع کنیم؟",
      ],
    },
  ];

  if (hour >= 5 && hour < 12) {
    base.unshift({
      id: "morning",
      lines: [
        "صبح بخیر ☀️",
        "امروز برای یادگیری آماده‌ای؟",
        "از کجا شروع کنیم؟",
      ],
    });
  } else if (hour >= 12 && hour < 17) {
    base.unshift({
      id: "afternoon",
      lines: [
        "سلام وقت بخیر 👋",
        "اگر سؤال درسی یا برنامه داری، با هم شروع کنیم.",
      ],
    });
  } else if (hour >= 17 && hour < 22) {
    base.unshift({
      id: "evening",
      lines: [
        "عصر بخیر 🌆",
        "مرور امروز یا برنامه‌ریزی فردا؟",
      ],
    });
  } else {
    base.unshift({
      id: "night",
      lines: [
        "شب بخیر 🌙",
        "آروم و متمرکز کمکت می‌کنم — بگو چی لازم داری.",
      ],
    });
  }

  // Approximate academic seasons (Jalali-ish by Gregorian month in Iran)
  if (month === 6 || month === 7) {
    base.push({
      id: "summer",
      lines: [
        "فصل تابستان است ☀️",
        "باشگاه تابستانی، مرور یا شروع برنامه تیزهوشان؟",
      ],
    });
  }
  if (month === 9 || month === 10) {
    base.push({
      id: "back-to-school",
      lines: [
        "فصل بازگشت به مدرسه 🎒",
        "ثبت‌نام، برنامه‌ریزی و انتخاب مسیر را با هم شروع کنیم.",
      ],
    });
  }
  if (month === 5 || month === 6 || month === 1) {
    base.push({
      id: "exam",
      lines: [
        "فصل آزمون‌ها نزدیک است 📝",
        "برنامه مطالعاتی، مرور و مدیریت زمان را با هم بچینیم.",
      ],
    });
  }

  return base;
}

export const ATRIN_QUICK_START = [
  { id: "lesson", emoji: "📚", label: "سوال درسی", prompt: "سوال درسی" },
  { id: "counsel", emoji: "🎯", label: "مشاوره", prompt: "مشاوره" },
  {
    id: "school",
    emoji: "🏫",
    label: "معرفی مؤسسه",
    prompt: "معرفی مؤسسه",
  },
  {
    id: "prereg",
    emoji: "📝",
    label: "پیش‌ثبت‌نام",
    prompt: "پیش‌ثبت‌نام",
  },
  {
    id: "gifted",
    emoji: "🏆",
    label: "تیزهوشان و نمونه دولتی",
    prompt: "تیزهوشان",
  },
  {
    id: "free",
    emoji: "💬",
    label: "هرچی دوست داری...",
    prompt: "سلام",
  },
] as const;

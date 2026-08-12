/**
 * Progressive lead profiling for آترین — natural conversation, never a form.
 * Flow: Need → Name → Grade → Goal → Help → Offer value → Phone later
 * Never ask phone first.
 */

export type AtrinLeadStep =
  | "idle"
  | "ask-name"
  | "ask-grade"
  | "ask-goal"
  | "helping"
  | "offer-value"
  | "ask-phone"
  | "done";

export type AtrinLeadPath =
  | "lesson"
  | "counsel"
  | "prereg"
  | "gifted"
  | "school"
  | "free"
  | null;

export type AtrinLeadState = {
  step: AtrinLeadStep;
  path: AtrinLeadPath;
  name: string | null;
  grade: string | null;
  goal: string | null;
  focus: string | null;
  major: string | null;
  phone: string | null;
  trustTurns: number;
  offeredValue: boolean;
};

const LEAD_KEY = "atrin-lead-v2";

const EMPTY: AtrinLeadState = {
  step: "idle",
  path: null,
  name: null,
  grade: null,
  goal: null,
  focus: null,
  major: null,
  phone: null,
  trustTurns: 0,
  offeredValue: false,
};

export function loadAtrinLead(): AtrinLeadState {
  if (typeof window === "undefined") return { ...EMPTY };
  try {
    const raw = window.localStorage.getItem(LEAD_KEY);
    if (!raw) return { ...EMPTY };
    const parsed = JSON.parse(raw) as Partial<AtrinLeadState>;
    return {
      ...EMPTY,
      ...parsed,
      step: parsed.step ?? "idle",
      path: parsed.path ?? null,
      offeredValue: Boolean(parsed.offeredValue),
    };
  } catch {
    return { ...EMPTY };
  }
}

export function saveAtrinLead(state: AtrinLeadState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LEAD_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export function resetAtrinLead(): void {
  saveAtrinLead({ ...EMPTY });
}

function looksLikePhone(text: string): boolean {
  const digits = text.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 13;
}

function looksLikeName(text: string): boolean {
  const t = text.trim();
  if (t.length < 2 || t.length > 40) return false;
  if (looksLikePhone(t)) return false;
  if (/\d/.test(t)) return false;
  return true;
}

/**
 * After a guided chip reply, continue progressive profiling naturally.
 * Phone is only offered late — after help and value.
 */
export function advanceLeadFromUserReply(
  text: string,
  current: AtrinLeadState,
): { state: AtrinLeadState; assistantFollowUp: string | null } {
  const trimmed = text.trim();
  let state: AtrinLeadState = {
    ...current,
    trustTurns: current.trustTurns + 1,
  };

  if (state.step === "ask-name" && looksLikeName(trimmed)) {
    state = { ...state, name: trimmed, step: "ask-grade" };
    return {
      state,
      assistantFollowUp: `${trimmed} عزیز، خوشحالم آشنا شدم 🌱\n\nپایه‌ات چنده؟`,
    };
  }

  if (state.step === "ask-grade") {
    state = { ...state, grade: trimmed, step: "ask-goal" };
    if (state.path === "lesson") {
      return {
        state,
        assistantFollowUp:
          "عالی.\n\nالان هدفت چیه؟ مثلاً حل یک سؤال، مرور یک مبحث، یا آمادگی آزمون؟",
      };
    }
    if (state.path === "gifted") {
      return {
        state,
        assistantFollowUp:
          "خوبه.\n\nهدفت از مسیر تیزهوشان یا نمونه دولتی چیه؟",
      };
    }
    if (state.path === "prereg") {
      return {
        state,
        assistantFollowUp:
          "ممنون.\n\nبرای ثبت‌نام بیشتر دنبال کدوم مسیر هستی؟",
      };
    }
    return {
      state,
      assistantFollowUp: "عالی. الان هدفت چیه تا دقیق‌تر کمکت کنم؟",
    };
  }

  if (state.step === "ask-goal") {
    state = {
      ...state,
      goal: trimmed,
      focus: trimmed,
      step: "helping",
    };
    // Hand off to real help — no form, no phone.
    return { state, assistantFollowUp: null };
  }

  if (state.step === "helping" && !state.offeredValue && state.trustTurns >= 3) {
    state = { ...state, step: "offer-value", offeredValue: true };
    const nameBit = state.name ? `${state.name} عزیز، ` : "";
    return {
      state,
      assistantFollowUp: `${nameBit}اگر دوست داری، می‌تونم برات یک برنامه کوتاه و شخصی هم پیشنهاد بدم — رایگان و بدون فشار.\n\nفعلاً بگو روی چی بیشتر تمرکز کنیم؟`,
    };
  }

  if (state.step === "offer-value" && state.trustTurns >= 5) {
    state = { ...state, step: "ask-phone" };
    return {
      state,
      assistantFollowUp:
        "اگر دوست داری ادامه مسیرت را شخصی‌تر کنم، می‌تونی شماره موبایلت را بفرستی.\n\nاجباری نیست — هر وقت آماده بودی بگو.",
    };
  }

  if (state.step === "ask-phone") {
    if (looksLikePhone(trimmed)) {
      state = { ...state, phone: trimmed.replace(/\D/g, ""), step: "done" };
      return {
        state,
        assistantFollowUp:
          "ممنون 🌟 ثبت شد. هر وقت خواستی ادامه بده — من اینجام.",
      };
    }
    if (/رد|نمیخوام|نمی‌خوام|بعدا|نه/.test(trimmed)) {
      state = { ...state, step: "done" };
      return {
        state,
        assistantFollowUp: "باشه، مشکلی نیست. بگو چطور کمکت کنم؟",
      };
    }
  }

  return { state, assistantFollowUp: null };
}

/** Chip starters: establish Need, then ask Name — never phone. */
export const ATRIN_CHIP_STARTERS = {
  lesson: {
    userLabel: "سوال درسی",
    assistant:
      "باشه 📚 بیا با هم شروع کنیم.\n\nدوست دارم با اسمت صدات کنم — اسمت چیه؟",
    leadStep: "ask-name" as const,
    path: "lesson" as const,
    modeHint: "study" as const,
  },
  counsel: {
    userLabel: "مشاوره",
    assistant:
      "حتماً 🎯 خوشحالم که اینجایی.\n\nاول بگو اسمت چیه تا راحت‌تر حرف بزنیم؟",
    leadStep: "ask-name" as const,
    path: "counsel" as const,
    modeHint: "counselor" as const,
  },
  school: {
    userLabel: "معرفی مؤسسه",
    assistant: `خوش اومدی 🏫 مؤسسه علمی ستارگان یک اکوسیستم آموزشی است؛ از دبستان تا مسیرهای تقویتی و مشاوره.

اگر دوست داری دقیق‌تر راهنمایی‌ات کنم، اسمت چیه؟`,
    leadStep: "ask-name" as const,
    path: "school" as const,
    modeHint: "school" as const,
  },
  prereg: {
    userLabel: "پیش ثبت نام",
    assistant:
      "خوش اومدی 🌱 برای پیش‌ثبت‌نام کمکت می‌کنم.\n\nاول اسمت چیه؟",
    leadStep: "ask-name" as const,
    path: "prereg" as const,
    modeHint: "admissions" as const,
  },
  gifted: {
    userLabel: "تیزهوشان و نمونه دولتی",
    assistant:
      "عالی 🏆 مسیر تیزهوشان و نمونه دولتی را با هم جلو می‌بریم.\n\nاسمت چیه؟",
    leadStep: "ask-name" as const,
    path: "gifted" as const,
    modeHint: "gifted" as const,
  },
  free: {
    userLabel: "هرچی دوست داری...",
    assistant:
      "باشه 💬 هرچی دوست داری بپرس.\n\nاگر مایل باشی، اول اسمت را بگو تا صمیمی‌تر کمکت کنم.",
    leadStep: "ask-name" as const,
    path: "free" as const,
    modeHint: "general" as const,
  },
} as const;

/** Grades the public consultation actually covers: پایه دوم through کنkur. پایه اول is intentionally absent. */
export const GRADES = [
  { id: "g2", label: "پایه دوم" },
  { id: "g3", label: "پایه سوم" },
  { id: "g4", label: "پایه چهارم" },
  { id: "g5", label: "پایه پنجم" },
  { id: "g6", label: "پایه ششم" },
  { id: "g7", label: "پایه هفتم" },
  { id: "g8", label: "پایه هشتم" },
  { id: "g9", label: "پایه نهم" },
  { id: "g10", label: "پایه دهم" },
  { id: "g11", label: "پایه یازدهم" },
  { id: "g12", label: "پایه دوازدهم" },
  { id: "konkur", label: "کنکور (داوطلب)" },
] as const;

export type GradeId = (typeof GRADES)[number]["id"];
const GRADE_IDS = new Set<string>(GRADES.map((g) => g.id));
export const isGradeId = (v: string): v is GradeId => GRADE_IDS.has(v);
export const gradeLabel = (id: string) => GRADES.find((g) => g.id === id)?.label ?? id;

export const WEEKDAYS = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"] as const;

export const MODE_LABEL = { ONLINE: "آنلاین", IN_PERSON: "حضوری" } as const;
export const AUDIENCE_LABEL = { PUBLIC: "مشاورهٔ رایگان", SPECIAL: "جلسهٔ ویژهٔ دانش‌آموز" } as const;
export const ROLE_LABEL = { PARENT: "والد", STUDENT: "دانش‌آموز" } as const;
export const STATUS_LABEL = { PENDING: "در انتظار تأیید", CONFIRMED: "تأییدشده", CANCELLED: "لغوشده" } as const;
export const PROOF_LABEL = { SMS: "پیامک", ACCESS_CODE: "کد دانش‌آموزی" } as const;

export type Audience = keyof typeof AUDIENCE_LABEL;
export type ConsultMode = keyof typeof MODE_LABEL;
export type BookerRole = keyof typeof ROLE_LABEL;
export type ConsultStatus = keyof typeof STATUS_LABEL;
export type PhoneProof = keyof typeof PROOF_LABEL;
export type NoticeKind = "CREATED" | "CANCELLED" | "MOVED" | "REMINDER";

export const DEFAULT_SMS = {
  created: "{name} عزیز، نوبت مشاورهٔ رایگان {mode} شما در ستارگان برای {date} ساعت {time} با {consultant} ثبت شد. کد پیگیری: {code}",
  cancelled: "{name} عزیز، نوبت مشاورهٔ {date} ساعت {time} لغو شد. برای وقت تازه دوباره به ستارگان سر بزنید. کد: {code}",
  moved: "{name} عزیز، نوبت مشاورهٔ شما به {date} ساعت {time} ({mode}، {consultant}) منتقل شد. کد: {code}",
  reminder: "{name} عزیز، یادآوری مشاورهٔ {mode} ستارگان: {date} ساعت {time} با {consultant}. کد: {code}",
} as const;

/** Unambiguous alphabet for student access codes (no 0/O/1/I). */
export const ACCESS_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const ACCESS_CODE_LENGTH = 10;

export const PUBLIC_PATH = "/moshavere";
export const SPECIAL_PATH = "/moshavere-vizhe";

export const GENERIC_CODE_ERROR = "این کد درست نیست یا دیگر فعال نیست.";
export const RATE_LIMIT_ERROR = "تعداد تلاش زیاد است. چند دقیقه بعد دوباره امتحان کنید.";

export const QUIZ_REWARD_ITEMS = [
  "۳ میلیون تومان تخفیف ثبت‌نام مشاوره VIP",
  "یک جلسه مشاوره رایگان",
  "یک هفته برنامهٔ شخصی‌سازی‌شده در پنل اختصاصی مؤسسه",
] as const;

/** SMS.ir Verify parameters are capped at 25 characters, so gifts are sent separately. */
export const DEFAULT_REWARD_SMS_TEXT = QUIZ_REWARD_ITEMS[0];
export const QUIZ_REWARD_SMS_ITEMS = [QUIZ_REWARD_ITEMS[0], QUIZ_REWARD_ITEMS[1], "یک هفته برنامهٔ شخصی در پنل"] as const;


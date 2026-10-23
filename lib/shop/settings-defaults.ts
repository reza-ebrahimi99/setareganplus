export type ShopSettings = {
  /** Shop accepts new orders */
  open: boolean;
  /** Banner on /shop (e.g. "ارسال نداریم؛ تحویل حضوری") */
  notice: string;
  /** Admin numbers that get an SMS for every paid order */
  adminMobiles: string[];
  adminSms: boolean;
};
export const DEFAULT_SHOP: ShopSettings = {
  open: true,
  notice: "جزوه‌ها چاپ و در شعبهٔ انتخابی شما تحویل حضوری داده می‌شوند؛ پس از آماده شدن، پیامک دریافت می‌کنید.",
  adminMobiles: [],
  adminSms: true,
};


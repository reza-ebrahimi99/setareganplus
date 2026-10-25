import { ogCard, OG_SIZE } from "@/lib/og/card";

export const alt = "ستارگان پلاس — مؤسسه علمی ستارگان نسیم‌شهر";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return ogCard({ title: "آموزشگاه تقویتی و کنکور، نمایندگی قلم‌چی نسیم‌شهر" });
}

import type { Metadata } from "next";
import { CenterPage } from "@/components/site/CenterPage";

export const metadata: Metadata = {
  title: "آموزشگاه تقویتی و کنکور ستارگان",
  description: "آموزشگاه تقویتی و کنکور ستارگان نسیم‌شهر: تقویت پایه، تیزهوشان و نمونه دولتی، کنکور و مشاوره تحصیلی.",
};

export default function Page() {
  return <CenterPage slug="education" />;
}

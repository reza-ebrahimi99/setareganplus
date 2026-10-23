import type { Metadata } from "next";
import { CenterPage } from "@/components/site/CenterPage";

export const metadata: Metadata = {
  title: "نمایندگی قلم‌چی نسیم‌شهر",
  description: "نمایندگی رسمی کانون فرهنگی آموزش (قلم‌چی) نسیم‌شهر؛ شعبه دختران و شعبه پسران.",
};

export default function Page() {
  return <CenterPage slug="ghalamchi" />;
}

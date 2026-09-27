import type { Metadata } from "next";
import "@/styles/academy.css";

export const metadata: Metadata = {
  title: {
    default: "آکادمی ستارگان",
    template: "%s | آکادمی ستارگان",
  },
  description:
    "آکادمی ستارگان — دوره‌ها و ویدئوهای آموزشی پریمیوم با پخش امن و کتابخانه شخصی.",
};

export default function AcademyRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

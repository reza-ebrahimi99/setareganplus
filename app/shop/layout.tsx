import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "استاربوک | کتاب‌فروشی ستارگان پلاس",
  description:
    "استاربوک، فروشگاه آموزشی ستارگان پلاس برای دانش‌آموزان ۱۰ تا ۱۹ سال؛ کشف کتاب، حراج زنده و خرید حضوری.",
};

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return children;
}

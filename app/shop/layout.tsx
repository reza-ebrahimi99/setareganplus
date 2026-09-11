import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "فروشگاه محصولات آموزشی | ستارگان پلاس",
  description:
    "فهرست جزوه‌ها و محصولات آموزشی ستارگان پلاس با امکان مشاهده مشخصات، قیمت و خرید آنلاین.",
};

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return children;
}

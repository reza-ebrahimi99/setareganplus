import { ogCard } from "@/lib/og/card";
import { getQuizSettings } from "@/lib/quiz/settings";

export async function GET() {
  const s = await getQuizSettings();
  const img = await ogCard({
    kicker: "تست رایگان الگوی مطالعه",
    title: s.title,
    foot: "ستارگان پلاس · نسیم‌شهر · هدیه در پایان تست",
  });
  img.headers.set("cache-control", "public, max-age=600, s-maxage=3600");
  return img;
}

/**
 * «افتخارآفرینان ۱۴۰۵» — university admissions of Ghalamchi Nasimshahr students (official poster
 * «موفقیت، انتخاب ماست»). Shown as individual cards on /rotbe-bartar-konkur and as a strip on the home page.
 * Plain data, no database: photos are 480×600 face-cropped webp in public/honors/1405/eftekhar/<slug>.webp
 * (+ <slug>-240.webp). major + " " + uni is exactly the caption printed on the poster.
 * Large poster cards carry no group tag; their group follows the poster's colour (blue/red/green).
 */
import { fa } from "@/lib/format";

export type EftekharGroup = "riazi" | "tajrobi" | "ensani" | "farhangian" | "honar" | "zaban";

export type EftekharStudent = {
  slug: string;
  name: string;
  major: string;
  uni: string;
  group: EftekharGroup;
  /** big card on the poster (medicine, dentistry, University of Tehran, …) */
  featured?: boolean;
};

export const EFTEKHAR_YEAR = 1405;
export const EFTEKHAR_ANCHOR = "eftekhar-afarinan";
export const EFTEKHAR_TITLE = `افتخارآفرینان ${fa(EFTEKHAR_YEAR)} قلم‌چی نسیم‌شهر`;
export const EFTEKHAR_POSTER = { src: "/honors/1405/eftekhar/poster-800.webp", large: "/honors/1405/eftekhar/poster-1600.webp", width: 1600, height: 1600 };

export const EFTEKHAR_GROUPS: Record<EftekharGroup, { label: string }> = {
  riazi: { label: "ریاضی" },
  tajrobi: { label: "تجربی" },
  ensani: { label: "انسانی" },
  farhangian: { label: "فرهنگیان" },
  honar: { label: "هنر" },
  zaban: { label: "زبان" },
};
export const EFTEKHAR_GROUP_ORDER: EftekharGroup[] = ["riazi", "tajrobi", "ensani", "farhangian", "honar", "zaban"];

/** Group colours follow the poster: ریاضی blue, تجربی red, انسانی green, فرهنگیان purple, هنر orange, زبان cyan. */
export const GROUP_STYLE: Record<EftekharGroup, { grad: string; text: string; soft: string; dot: string }> = {
  riazi: { grad: "from-[#3b74ff] to-[#1d3fb3]", text: "text-[#1f4fd8]", soft: "bg-[#edf2ff]", dot: "bg-[#2f63f0]" },
  tajrobi: { grad: "from-[#f04a57] to-[#b51f37]", text: "text-[#c8263a]", soft: "bg-[#fdeef0]", dot: "bg-[#e23a4a]" },
  ensani: { grad: "from-[#22b77e] to-[#0b7a52]", text: "text-[#0f8a5c]", soft: "bg-[#e9f8f1]", dot: "bg-[#19a36d]" },
  farhangian: { grad: "from-[#a855f7] to-[#6d28d9]", text: "text-[#7e22ce]", soft: "bg-[#f5edff]", dot: "bg-[#9b2bea]" },
  honar: { grad: "from-[#fb923c] to-[#d9590b]", text: "text-[#c2540a]", soft: "bg-[#fff1e6]", dot: "bg-[#f07d00]" },
  zaban: { grad: "from-[#22c5e6] to-[#0b85a8]", text: "text-[#0a7f9c]", soft: "bg-[#e6f8fc]", dot: "bg-[#0fb3d6]" },
};

/** Featured first (medicine and dentistry leading), then by group. */
export const EFTEKHAR: EftekharStudent[] = [
  { slug: "ali-kabiri", name: "علی کبیری", major: "پزشکی", uni: "دانشگاه ایران", group: "tajrobi", featured: true },
  { slug: "amirhossein-omidi", name: "امیرحسین امیدی", major: "دندان‌پزشکی", uni: "دانشگاه تهران", group: "tajrobi", featured: true },
  { slug: "abolfazl-soleimani", name: "ابوالفضل سلیمانی", major: "پزشکی", uni: "دانشگاه ایران", group: "tajrobi", featured: true },
  { slug: "amirmahdi-soleimani", name: "امیرمهدی سلیمانی", major: "پزشکی", uni: "دانشگاه ایران", group: "tajrobi", featured: true },
  { slug: "ali-mohammadi", name: "علی محمدی", major: "پزشکی", uni: "دانشگاه البرز", group: "tajrobi", featured: true },
  { slug: "sajjad-rafei", name: "سجاد رافعی", major: "کامپیوتر", uni: "دانشگاه تهران", group: "riazi", featured: true },
  { slug: "matin-lotfzadeh", name: "متین لطف‌زاده", major: "مکانیک", uni: "دانشگاه تهران", group: "riazi", featured: true },
  { slug: "mahdiar-manafzadeh", name: "مهدیار مناف‌زاده", major: "مهندسی شیمی", uni: "دانشگاه تهران", group: "riazi", featured: true },
  { slug: "hossein-mohammadian", name: "حسین محمدیان", major: "برق", uni: "علم و صنعت", group: "riazi", featured: true },
  { slug: "maedeh-asgari", name: "مائده عسگری", major: "حقوق", uni: "علامه طباطبایی", group: "ensani", featured: true },
  { slug: "sooda-parnalou", name: "سودا پرنلو", major: "مشاوره", uni: "شهید بهشتی", group: "ensani", featured: true },
  { slug: "negar-koochakzadeh", name: "نگار کوچک‌زاده", major: "مشاوره", uni: "شهید بهشتی", group: "ensani", featured: true },
  { slug: "ameneh-gheydari", name: "آمنه قیداری", major: "مشاوره", uni: "الزهرا", group: "ensani", featured: true },
  { slug: "yalda-sadat-ghaderi", name: "یلدا سادات قادری", major: "مهندسی پلیمر", uni: "قم", group: "riazi" },
  { slug: "zahra-mohammadi", name: "زهرا محمدی", major: "عمران", uni: "گرمسار", group: "riazi" },
  { slug: "roya-javan", name: "رویا جوان", major: "مهندسی صنایع", uni: "سبزوار", group: "riazi" },
  { slug: "asal-abbasi", name: "عسل عباسی", major: "فیزیک مهندسی", uni: "بوعلی همدان", group: "riazi" },
  { slug: "arshia-taheri", name: "ارشیا طاهری", major: "مکانیک", uni: "محقق اردبیلی", group: "riazi" },
  { slug: "mohammadmahdi-zirak", name: "محمدمهدی زیرک", major: "مهندسی برق", uni: "محقق اردبیلی", group: "riazi" },
  { slug: "mahdi-ahmadi", name: "مهدی احمدی", major: "مهندسی کامپیوتر", uni: "دانشگاه گلستان", group: "riazi" },
  { slug: "haniyeh-moradi", name: "هانیه مرادی", major: "مهندسی شیمی", uni: "زنجان", group: "riazi" },
  { slug: "amirmohammad-salehi", name: "امیرمحمد صالحی", major: "مهندسی معدن", uni: "امیرکبیر", group: "riazi" },
  { slug: "zahra-torabi", name: "زهرا ترابی", major: "پرستاری", uni: "دانشگاه تهران", group: "tajrobi" },
  { slug: "maryam-ghorbanianfard", name: "مریم قربانیان‌فرد", major: "هوشبری", uni: "دانشگاه شهید بهشتی", group: "tajrobi" },
  { slug: "haniyeh-rahami", name: "هانیه رهامی", major: "صنایع غذایی", uni: "دانشگاه شهید بهشتی", group: "tajrobi" },
  { slug: "milad-tayefeh", name: "میلاد طایفه", major: "شیمی محض", uni: "دانشگاه تهران", group: "tajrobi" },
  { slug: "fatemeh-pashaei", name: "فاطمه پاشایی", major: "علم داده", uni: "دانشگاه الزهرا", group: "ensani" },
  { slug: "melika-farshi", name: "ملیکا فرشی", major: "تاریخ", uni: "علامه طباطبایی", group: "ensani" },
  { slug: "masoumeh-amanollahi", name: "معصومه امان‌الهی", major: "جغرافیا", uni: "خوارزمی", group: "ensani" },
  { slug: "nazaninzahra-akhavi", name: "نازنین‌زهرا اخوی", major: "مدیریت بازرگانی", uni: "دانشگاه قم", group: "ensani" },
  { slug: "fatima-liriaei", name: "فاطیما لیریائی", major: "فلسفه", uni: "خوارزمی", group: "ensani" },
  { slug: "hadiseh-najafi", name: "حدیثه نجفی", major: "روانشناسی", uni: "علم و فرهنگ", group: "ensani" },
  { slug: "zahra-jabbari", name: "زهرا جباری", major: "آموزش فیزیک", uni: "دانشگاه فرهنگیان", group: "farhangian" },
  { slug: "haniyeh-pourmohammad", name: "هانیه پورمحمد", major: "آموزش زبان عربی", uni: "دانشگاه فرهنگیان", group: "farhangian" },
  { slug: "amirmohammad-kheirollahi", name: "امیرمحمد خیرالهی", major: "آموزش ابتدایی", uni: "فرهنگیان", group: "farhangian" },
  { slug: "narges-zeinali", name: "نرگس زینعلی", major: "آموزش ابتدایی", uni: "فرهنگیان", group: "farhangian" },
  { slug: "hadiseh-arandan", name: "حدیثه ارندان", major: "آموزش زبان عربی", uni: "دانشگاه فرهنگیان", group: "farhangian" },
  { slug: "mobina-safari", name: "مبینا صفری", major: "آموزش زبان عربی", uni: "دانشگاه فرهنگیان", group: "farhangian" },
  { slug: "parisa-mohajer", name: "پریسا مهاجر", major: "آموزش ابتدایی", uni: "فرهنگیان", group: "farhangian" },
  { slug: "ilia-asadian", name: "ایلیا اسدیان", major: "جغرافیا", uni: "فرهنگیان", group: "farhangian" },
  { slug: "abolfazl-shiralipour", name: "ابوالفضل شیرعلیپور", major: "علوم اجتماعی", uni: "فرهنگیان", group: "farhangian" },
  { slug: "zahra-soleimani", name: "زهرا سلیمانی", major: "امور تربیتی", uni: "فرهنگیان", group: "farhangian" },
  { slug: "setayesh-namdari", name: "ستایش نامداری", major: "تربیت بدنی", uni: "فرهنگیان", group: "farhangian" },
  { slug: "soheil-asadi", name: "سهیل اسدی", major: "کامپیوتر", uni: "صنعتی اراک", group: "honar" },
  { slug: "zahra-sotoudeh", name: "زهرا ستوده", major: "زبان انگلیسی", uni: "دانشگاه قم", group: "zaban" },
];

export const eftekharPhoto = (s: EftekharStudent, w: 240 | 480 = 480) => `/honors/1405/eftekhar/${s.slug}${w === 240 ? "-240" : ""}.webp`;

/** "پزشکی دانشگاه ایران" — the caption exactly as printed on the poster. */
export const eftekharCaption = (s: EftekharStudent) => `${s.major} ${s.uni}`;

/** Alt text: «نام — رشته دانشگاه — قلم‌چی نسیم‌شهر». */
export const eftekharAlt = (s: EftekharStudent) => `${s.name} — ${eftekharCaption(s)} — قلم‌چی نسیم‌شهر`;

export function eftekharCounts(list: EftekharStudent[] = EFTEKHAR): Record<EftekharGroup, number> {
  const c = Object.fromEntries(EFTEKHAR_GROUP_ORDER.map((g) => [g, 0])) as Record<EftekharGroup, number>;
  for (const s of list) c[s.group]++;
  return c;
}

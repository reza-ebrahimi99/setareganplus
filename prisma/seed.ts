/**
 * Seed real content (from the live-site audit + server snapshot content/*.ts).
 * Content tables are REPLACED; forms are created only if missing; submissions are never touched.
 *   npm run db:seed
 */
import "dotenv/config";
import { readFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
const ASSETS = path.join(__dirname, "seed-assets");
const OUT = path.join(path.resolve(process.env.UPLOAD_DIR || "./storage/uploads"), "public", "seed");

type SeedData = {
  team: { name: string; roles: string[]; education: string | null; department: string; bio: string[]; photo: string | null }[];
  achievements: { category: "KONKUR" | "GIFTED"; name: string; grade: string | null; detail: string | null; year: string | null; featured: boolean; photo: string | null }[];
  albums: { slug: string; title: string; photos: { file: string; caption: string | null }[] }[];
};
const data: SeedData = JSON.parse(readFileSync(path.join(__dirname, "seed-data.json"), "utf8"));

const FA = "۰۱۲۳۴۵۶۷۸۹";
const fa = (s: string) => s.replace(/[0-9]/g, (d) => FA[+d]);

async function img(file: string | null, width = 1600): Promise<string | null> {
  if (!file) return null;
  const src = path.join(ASSETS, file);
  if (!existsSync(src)) return null;
  const name = file.replace(/\.[a-z]+$/i, "") + ".webp";
  const dest = path.join(OUT, name);
  if (!existsSync(dest)) {
    await sharp(src).rotate().resize({ width, withoutEnlargement: true }).webp({ quality: 80 }).toFile(dest);
  }
  return `/media/seed/${name}`;
}

async function main() {
  mkdirSync(OUT, { recursive: true });

  // ── Settings ────────────────────────────────────────────────────────────
  const settings: Record<string, unknown> = {
    contact: {
      phones: ["02156766772", "02156766874", "09380190586", "09384567054"],
      hours: ["هر روز: ۱۲:۰۰ تا ۲۰:۳۰", "پنج‌شنبه: ۱۰:۰۰ تا ۲۰:۳۰"],
      branches: [
        {
          name: "شعبه پسران",
          address: "نسیم‌شهر، خیابان امام خمینی، بین بانک مسکن و کلانتری، کوچه مدرسه، پلاک ۵",
          mapUrl: "https://maps.app.goo.gl/jKQLs65S6Jv8MfKv8?g_st=ac",
        },
        {
          name: "شعبه دختران",
          address: "نسیم‌شهر، خیابان امام خمینی، نرسیده به خیابان سوم، کوچه پاییزان، پلاک ۱۸۸",
          mapUrl: "https://maps.app.goo.gl/b8b8v3bMTGksEUhMA?g_st=ac",
        },
      ],
      social: [
        { label: "اینستاگرام", url: "https://www.instagram.com/Ghalamchinasimshahr" },
        { label: "بله", url: "https://ble.ir/join/ANGRKipzkv" },
        { label: "تلگرام", url: "https://t.me/setareganinstitute1" },
      ],
      enamadUrl: "https://trustseal.enamad.ir/?id=762691&Code=Jm7HRlnpSah7mgppTajp15hMnQLMeXSI",
    },
    stats: [
      { value: "378", label: "فارغ‌التحصیل" },
      { value: "58", label: "قبولی تیزهوشان و نمونه دولتی" },
      { value: "13", label: "قبولی نمونه دولتی" },
      { value: "58", label: "استاد، معلم و همکار آموزشی" },
    ],
    home: {
      eyebrow: "مؤسسه علمی ستارگان · نسیم‌شهر",
      title: "جایی که آینده ساخته می‌شود.",
      subtitle:
        "از تقویت پایه تا موفقیت در مدارس تیزهوشان و نمونه دولتی، کنکور و انتخاب رشته، کنار دانش‌آموزان هستیم.",
      slogan: "چون تو لایق بهترینی...",
      heroImage: await img("images__hero__hero.jpg", 2000),
    },
    about: {
      intro:
        "بیش از یک دهه همراه دانش‌آموزان در مسیر موفقیت؛ از نخستین کلاس‌های تقویتی تا امروز، هر مرحله سنگی در بنای اعتماد خانواده‌ها بوده است.",
      mission: "پرورش دانش‌آموزانی توانمند، خلاق و آماده آینده.",
      vision: "تبدیل شدن به هوشمندترین مجموعه آموزشی کشور با استفاده از فناوری، آموزش نوین و هوش مصنوعی.",
      values: [
        { title: "مسئولیت‌پذیری", text: "تعهد به نتیجه یادگیری و همراهی شفاف با دانش‌آموز و خانواده." },
        { title: "یادگیری مستمر", text: "به‌روزرسانی روش‌های تدریس و بهره‌گیری از تجربه و داده آموزشی." },
        { title: "احترام", text: "فضایی مبتنی بر کرامت، اعتماد و گفت‌وگوی سازنده." },
        { title: "خلاقیت", text: "تشویق تفکر نو و حل مسئله فراتر از حفظ مطالب." },
        { title: "رشد فردی", text: "توجه به مسیر شخصی هر دانش‌آموز در کنار پیشرفت تحصیلی." },
        { title: "فناوری", text: "به‌کارگیری ابزارهای هوشمند برای دسترسی بهتر و آموزش مؤثرتر." },
      ],
      timeline: [
        { year: "۱۳۹۴", title: "آغاز فعالیت آموزشگاه تقویتی و کنکور ستارگان", text: "نقطه شروع مسیر آموزشی مجموعه با تمرکز بر تقویت پایه و آمادگی کنکور." },
        { year: "۱۴۰۰", title: "تأسیس دبستان غیردولتی ستارگان آینده" },
        { year: "۱۴۰۱", title: "اخذ نمایندگی رسمی قلم‌چی نسیم‌شهر", text: "پیوند رسمی با کانون فرهنگی آموزش برای آزمون‌ها و برنامه استاندارد آموزشی." },
        { year: "۱۴۰۵", title: "راه‌اندازی شعبه‌های مجزای دختران و پسران قلم‌چی نسیم‌شهر", text: "توسعه ظرفیت خدمت‌رسانی با دو شعبه تخصصی برای دانش‌آموزان دختر و پسر." },
      ],
      founder: {
        name: "رضا ابراهیمی",
        title: "مؤسس و مدیرعامل مؤسسه آموزشی ستارگان",
        bio: "رضا ابراهیمی، مؤسس و مدیرعامل مؤسسه آموزشی ستارگان و مدیر نمایندگی رسمی قلم‌چی نسیم‌شهر است. ایشان به‌عنوان مدرس و مؤلف ریاضیات، راهبری آموزشی مجموعه ستارگان را بر عهده دارند.",
        points: [
          "فارغ‌التحصیل دانشگاه صنعتی امیرکبیر (پلی‌تکنیک تهران)",
          "رتبه ۴۵۱ کنکور سراسری",
          "مسئول نمایندگی قلم‌چی نسیم‌شهر",
          "مؤلف کتاب ریاضی جامع کنکور",
          "بیش از ۱۳ سال سابقه تدریس، مشاوره و برنامه‌ریزی تحصیلی",
        ],
        photo: await img("images__founder__portrait.jpg", 1200),
      },
      images: [
        { src: await img("images__about__about.png"), alt: "تابلوی آموزشگاه علمی ستارگان" },
        { src: await img("images__about__girls-branch.png"), alt: "تابلوی آموزشگاه علمی ستارگان در نسیم‌شهر" },
        { src: await img("images__gallery__gallery-5.jpg"), alt: "همایش ادبیات پایه یازدهم در نمایندگی قلم‌چی" },
        { src: await img("images__gallery__gallery-1.jpg"), alt: "استاد در حال تدریس برای جمعی از دانش‌آموزان در کارگاه آموزشی" },
        { src: await img("images__gallery__gallery-4.jpg"), alt: "کلاس آموزشی با حضور استاد پای تخته و دانش‌آموزان" },
        { src: await img("images__gallery__gallery-6.jpg"), alt: "استاد در حال آموزش کنار تخته سفید برای جمعی از دانش‌آموزان" },
      ],
    },
  };
  for (const [key, value] of Object.entries(settings)) {
    await prisma.setting.upsert({ where: { key }, create: { key, value: value as object }, update: { value: value as object } });
  }

  // ── Forms (create only if missing) ──────────────────────────────────────
  const reg = await prisma.form.findUnique({ where: { slug: "pre-registration" } });
  if (!reg) {
    await prisma.form.create({
      data: {
        slug: "pre-registration",
        title: "فرم پیش‌ثبت‌نام خدمات مؤسسه ستارگان",
        description: "اطلاعات خود را ثبت کنید؛ همکاران ما در زمینه تخصصی انتخاب‌شده با شما تماس می‌گیرند.",
        status: "PUBLISHED",
        isSystem: true,
        submitLabel: "ثبت پیش‌ثبت‌نام",
        fields: [
          { id: "full_name", type: "text", label: "نام و نام خانوادگی", required: true, half: true },
          { id: "phone", type: "phone", label: "شماره تماس", required: true, half: true, placeholder: "۰۹۱۲۱۲۳۴۵۶۷" },
          {
            id: "section",
            type: "radio",
            label: "قصد پیش‌ثبت‌نام در کدام بخش مؤسسه ستارگان را دارید؟",
            help: "با انتخاب درست، همکاران ما در زمینه تخصصی با شما تماس خواهند گرفت.",
            required: true,
            options: [
              "کلاس‌های تقویتی و کنکور",
              "کلاس‌های تیزهوشان و نمونه دولتی",
              "مشاوره تحصیلی",
              "آزمون‌های قلم‌چی",
              "پانسیون مطالعاتی",
            ],
          },
        ],
      },
    });
  }

  // ── Centers ─────────────────────────────────────────────────────────────
  await prisma.center.deleteMany();
  await prisma.center.create({
    data: {
      slug: "education",
      name: "آموزشگاه تقویتی و کنکور ستارگان",
      shortName: "آموزشگاه ستارگان",
      tagline: "تقویت پایه، دوره‌های هدفمند و آمادگی کنکور در کنار مشاوره تحصیلی.",
      intro:
        "آموزشگاه تقویتی و کنکور ستارگان از سال ۱۳۹۴ فعالیت خود را آغاز کرد؛ نقطه شروع مسیر آموزشی مجموعه با تمرکز بر تقویت پایه و آمادگی کنکور.",
      body: "",
      highlights: [
        { title: "متوسطه اول", text: "تقویت بنیان درسی و آمادگی برای مسیرهای برتر تحصیلی." },
        { title: "متوسطه دوم", text: "برنامه منسجم پایه‌های دهم تا دوازدهم و امتحانات نهایی." },
        { title: "کنکور", text: "آمادگی هدفمند با برنامه، آزمون و همراهی مشاور." },
        { title: "انتخاب رشته", text: "تصمیم آگاهانه برای آینده؛ هم‌راستا با استعداد و هدف." },
        { title: "کلاس‌های تیزهوشان و نمونه دولتی", text: "" },
        { title: "مشاوره تحصیلی", text: "راهنمایی تحصیلی در مسیر کنکور و انتخاب رشته." },
        { title: "پانسیون مطالعاتی", text: "" },
      ],
      branches: [],
      heroImage: await img("images__about__about.png"),
      formSlug: "pre-registration",
      sortOrder: 1,
    },
  });
  await prisma.center.create({
    data: {
      slug: "ghalamchi",
      name: "نمایندگی قلم‌چی نسیم‌شهر",
      shortName: "قلم‌چی نسیم‌شهر",
      tagline: "نمایندگی رسمی کانون فرهنگی آموزش (قلم‌چی) نسیم‌شهر",
      intro:
        "نمایندگی رسمی کانون فرهنگی آموزش (قلم‌چی) نسیم‌شهر برنامه آموزشی، آزمون‌های منظم و محتوای آموزشی مطابق استانداردهای کانون قلم‌چی را در اختیار دانش‌آموزان نسیم‌شهر قرار می‌دهد.",
      body:
        "نمایندگی قلم‌چی نسیم‌شهر از سال ۱۴۰۱ فعالیت می‌کند و از سال ۱۴۰۵ با دو شعبه مجزا برای دانش‌آموزان دختر و پسر به خانواده‌ها خدمت می‌دهد.",
      highlights: [
        { title: "برنامه استاندارد کانون", text: "اجرای برنامه آموزشی یکپارچه مطابق کانون فرهنگی آموزش قلم‌چی" },
        { title: "آزمون‌های منظم", text: "برگزاری آزمون‌های آموزشی در چارچوب نظام ارزیابی کانون قلم‌چی" },
        { title: "محتوای آموزشی کانون", text: "دسترسی به منابع و محتوای آموزشی کانون قلم‌چی" },
        { title: "مشاوره تحصیلی", text: "راهنمایی تحصیلی در مسیر کنکور و انتخاب رشته" },
      ],
      branches: (settings.contact as { branches: unknown[] }).branches as object[],
      heroImage: await img("images__gallery__gallery-5.jpg"),
      formSlug: "pre-registration",
      sortOrder: 2,
    },
  });

  // ── Team ────────────────────────────────────────────────────────────────
  await prisma.teamMember.deleteMany();
  for (const [i, t] of data.team.entries()) {
    await prisma.teamMember.create({
      data: {
        name: t.name,
        role: t.roles.join(" · "),
        education: t.education && !t.roles.includes(t.education) ? t.education : null,
        department: t.department,
        bio: t.bio.join("\n"),
        photo: await img(t.photo, 720),
        featured: i < 4,
        sortOrder: i,
      },
    });
  }

  // ── Achievements ────────────────────────────────────────────────────────
  await prisma.achievement.deleteMany();
  for (const [i, a] of data.achievements.entries()) {
    await prisma.achievement.create({
      data: {
        name: a.name,
        category: a.category,
        grade: a.grade,
        detail: a.detail,
        year: a.year ? fa(a.year) : null,
        featured: a.featured,
        photo: await img(a.photo, 720),
        sortOrder: i,
      },
    });
  }

  // ── Gallery ─────────────────────────────────────────────────────────────
  await prisma.galleryAlbum.deleteMany();
  const albumMeta: Record<string, { title: string; center: string; order: number }> = {
    azmon02051405: { title: "آزمون ۲ مرداد قلم‌چی", center: "ghalamchi", order: 1 },
    "album-mrxkm70v": { title: "جلسات مشاوره‌ای توضیح برنامه راهبردی تابستان ۱۴۰۵", center: "education", order: 2 },
  };
  for (const al of data.albums) {
    const meta = albumMeta[al.slug];
    const photos = [];
    for (const [i, p] of al.photos.entries()) photos.push({ path: (await img(p.file))!, caption: null, sortOrder: i });
    await prisma.galleryAlbum.create({
      data: {
        slug: al.slug,
        title: meta?.title ?? al.title,
        center: meta?.center,
        cover: photos[0]?.path,
        sortOrder: meta?.order ?? 9,
        photos: { create: photos },
      },
    });
  }

  // ── FAQ ─────────────────────────────────────────────────────────────────
  await prisma.faq.deleteMany();
  const faqs = [
    ["ستارگان پلاس چیست؟", "ستارگان پلاس وب‌سایت رسمی مؤسسه علمی ستارگان در نسیم‌شهر است و دو مرکز مجموعه را معرفی می‌کند: آموزشگاه تقویتی و کنکور ستارگان و نمایندگی قلم‌چی نسیم‌شهر."],
    ["چه خدماتی ارائه می‌شود؟", "کلاس‌های تقویتی و کنکور، کلاس‌های تیزهوشان و نمونه دولتی، مشاوره تحصیلی، آزمون‌های قلم‌چی و پانسیون مطالعاتی."],
    ["چگونه پیش‌ثبت‌نام کنم؟", "فرم پیش‌ثبت‌نام را در همین سایت تکمیل کنید و بخش موردنظر را انتخاب کنید؛ همکاران ما برای ادامه مراحل با شما تماس می‌گیرند. می‌توانید با شماره‌های مؤسسه هم تماس بگیرید."],
    ["آیا این سایت به سیستم‌های کانون قلم‌چی متصل است؟", "خیر. ستارگان پلاس سایت اختصاصی مؤسسه ستارگان در نسیم‌شهر است و ادعایی درباره اتصال فنی به سیستم‌ها یا داده‌های کانون قلم‌چی ندارد."],
    ["اطلاعات تماس و نشانی شعبه‌ها کجاست؟", "شماره‌های تماس، نشانی شعبه‌های دختران و پسران، لینک نقشه و ساعات کاری در صفحه «تماس با ما» آمده است."],
  ];
  for (const [i, [question, answer]] of faqs.entries()) await prisma.faq.create({ data: { question, answer, sortOrder: i } });

  console.log("Seed complete:", {
    team: data.team.length,
    achievements: data.achievements.length,
    albums: data.albums.map((a) => `${a.slug}:${a.photos.length}`),
    faqs: faqs.length,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

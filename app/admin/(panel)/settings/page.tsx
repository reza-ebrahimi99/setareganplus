import { redirect } from "next/navigation";
import { requirePerm, logAction } from "@/lib/auth";
import { getSettings, saveSetting } from "@/lib/settings";
import { s, rows, lines, imageField } from "@/lib/admin";
import { toEn } from "@/lib/format";
import { PageTitle, Panel, Field, Area, ImageInput, SaveBar, Flash } from "@/components/admin/ui";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  await requirePerm("site.settings");
  const { ok } = await searchParams;
  const st = await getSettings();
  const { contact, stats, home, about } = st;

  async function save(fd: FormData) {
    "use server";
    const me = await requirePerm("site.settings");
    const cur = await getSettings();
    await saveSetting("contact", {
      phones: lines(s(fd, "phones")).map((p) => toEn(p).replace(/[^\d+]/g, "")),
      hours: lines(s(fd, "hours")),
      branches: rows(s(fd, "branches"), 3).map(([name, address, mapUrl]) => ({ name, address, mapUrl })),
      social: rows(s(fd, "social"), 2).map(([label, url]) => ({ label, url })),
      enamadUrl: s(fd, "enamadUrl") || undefined,
    });
    await saveSetting("stats", rows(s(fd, "stats"), 2).map(([value, label]) => ({ value: toEn(value), label })));
    await saveSetting("home", {
      eyebrow: s(fd, "h_eyebrow"),
      title: s(fd, "h_title"),
      subtitle: s(fd, "h_subtitle"),
      slogan: s(fd, "h_slogan"),
      heroImage: (await imageField(fd, "h_image", cur.home.heroImage || null, "site", 2000)) ?? "",
    });
    await saveSetting("about", {
      ...cur.about,
      intro: s(fd, "a_intro"),
      mission: s(fd, "a_mission"),
      vision: s(fd, "a_vision"),
      values: rows(s(fd, "a_values"), 2).map(([title, text]) => ({ title, text })),
      timeline: rows(s(fd, "a_timeline"), 3).map(([year, title, text]) => ({ year, title, text: text || undefined })),
      founder: {
        name: s(fd, "f_name"),
        title: s(fd, "f_title"),
        bio: s(fd, "f_bio"),
        points: lines(s(fd, "f_points")),
        photo: (await imageField(fd, "f_photo", cur.about.founder.photo || null, "site", 1200)) ?? "",
      },
    });
    await logAction(me, "site.settings", "تنظیمات سایت ذخیره شد");
    redirect("/admin/settings?ok=1");
  }

  return (
    <>
      <PageTitle title="تنظیمات سایت" sub="اطلاعات تماس، آمار، صفحه اصلی و درباره ما" />
      <Flash ok={ok} />
      <form action={save} className="space-y-6">
        <Panel title="تماس و شعبه‌ها">
          <div className="grid gap-5 md:grid-cols-2">
            <Area label="شماره‌های تماس (هر خط یکی)" name="phones" defaultValue={contact.phones.join("\n")} dir="ltr" />
            <Area label="ساعات کاری (هر خط یکی)" name="hours" defaultValue={contact.hours.join("\n")} />
            <div className="md:col-span-2"><Area label="شعبه‌ها: نام | نشانی | لینک نقشه" name="branches" rows={3} defaultValue={contact.branches.map((x) => `${x.name} | ${x.address} | ${x.mapUrl ?? ""}`).join("\n")} /></div>
            <Area label="شبکه‌های اجتماعی: عنوان | لینک" name="social" defaultValue={contact.social.map((x) => `${x.label} | ${x.url}`).join("\n")} />
            <Field label="لینک اینماد" name="enamadUrl" defaultValue={contact.enamadUrl} dir="ltr" />
          </div>
        </Panel>
        <Panel title="آمار مؤسسه">
          <Area label="هر خط: عدد | عنوان" name="stats" defaultValue={stats.map((x) => `${x.value} | ${x.label}`).join("\n")} />
        </Panel>
        <Panel title="صفحه اصلی">
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="بالای عنوان" name="h_eyebrow" defaultValue={home.eyebrow} />
            <Field label="شعار" name="h_slogan" defaultValue={home.slogan} />
            <div className="md:col-span-2"><Field label="عنوان اصلی" name="h_title" defaultValue={home.title} /></div>
            <div className="md:col-span-2"><Area label="زیرعنوان" name="h_subtitle" defaultValue={home.subtitle} rows={2} /></div>
            <ImageInput label="تصویر اصلی" name="h_image" current={home.heroImage} />
          </div>
        </Panel>
        <Panel title="درباره ما">
          <div className="grid gap-5 md:grid-cols-2">
            <div className="md:col-span-2"><Area label="مقدمه" name="a_intro" defaultValue={about.intro} rows={2} /></div>
            <Area label="مأموریت" name="a_mission" defaultValue={about.mission} rows={2} />
            <Area label="چشم‌انداز" name="a_vision" defaultValue={about.vision} rows={2} />
            <div className="md:col-span-2"><Area label="ارزش‌ها: عنوان | توضیح" name="a_values" rows={6} defaultValue={about.values.map((v) => `${v.title} | ${v.text}`).join("\n")} /></div>
            <div className="md:col-span-2"><Area label="تاریخچه: سال | عنوان | توضیح" name="a_timeline" rows={5} defaultValue={about.timeline.map((t) => `${t.year} | ${t.title} | ${t.text ?? ""}`).join("\n")} /></div>
          </div>
        </Panel>
        <Panel title="مؤسس">
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="نام" name="f_name" defaultValue={about.founder.name} />
            <Field label="عنوان" name="f_title" defaultValue={about.founder.title} />
            <div className="md:col-span-2"><Area label="معرفی" name="f_bio" defaultValue={about.founder.bio} rows={3} /></div>
            <Area label="سوابق (هر خط یکی)" name="f_points" defaultValue={about.founder.points.join("\n")} rows={5} />
            <ImageInput label="عکس" name="f_photo" current={about.founder.photo} />
          </div>
        </Panel>
        <SaveBar />
      </form>
    </>
  );
}

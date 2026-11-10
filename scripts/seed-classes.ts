/**
 * Create-only seed for video courses. Safe to re-run: existing courses, lessons and paths are left as staff edited them.
 *   npm run classes:seed
 * Loads .env itself, because PM2 injects env into the app but not into this command.
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import path from "node:path";
import { prisma } from "../lib/prisma";
import { parseCsv } from "../lib/classes/csv";
import { buildCatalog, toRaw } from "../lib/classes/map";
import { FIELDS, GRADES, PATH_ORDER, fieldLabel, gradeLabel } from "../lib/classes/catalog";
import { PREMIUM_SEED_LESSONS } from "../lib/classes/premium-seed";

const dir = path.join(process.cwd(), "prisma/class-seed");
const read = (name: string) => parseCsv(readFileSync(path.join(dir, name), "utf8"));

async function main() {
  const courses = buildCatalog(
    read("plan.csv").map(toRaw),
    read("plan2.csv").map(toRaw),
    read("regroup.csv").map((r) => ({ hash: r.hash, target: r.target_playlist })),
    read("inventory.csv").map((r) => ({ hash: r.hash, duration: r.duration })),
  );
  let createdCourses = 0;
  let createdLessons = 0;
  for (const c of courses) {
    let row = await prisma.classCourse.findUnique({ where: { slug: c.slug } });
    if (!row) {
      row = await prisma.classCourse.create({
        data: {
          slug: c.slug,
          title: c.title,
          summary: c.summary,
          intro: c.intro,
          teacher: c.teacher,
          grades: c.grades,
          fields: c.fields,
          kind: c.kind,
          sortOrder: c.sortOrder,
          priceRials: c.priceRials,
          isFree: c.isFree,
          published: true,
        },
      });
      createdCourses++;
    }
    for (const lesson of c.lessons) {
      const exists = await prisma.classLesson.findUnique({ where: { aparatHash: lesson.aparatHash }, select: { id: true } });
      if (exists) continue;
      await prisma.classLesson.create({
        data: {
          courseId: row.id,
          aparatHash: lesson.aparatHash,
          title: lesson.title,
          description: lesson.description || null,
          durationSec: lesson.durationSec,
          grades: lesson.grades,
          fields: lesson.fields,
          sortOrder: lesson.sortOrder,
          poster: lesson.poster || null,
          published: true,
        },
      });
      createdLessons++;
    }
  }

  const all = await prisma.classCourse.findMany({ select: { id: true, slug: true, grades: true, fields: true, kind: true } });
  const bySlug = new Map(all.map((c) => [c.slug, c]));
  let createdPaths = 0;
  for (const grade of ["g10", "g11", "g12", "konkur"] as const) {
    for (const field of FIELDS) {
      const exists = await prisma.classPath.findUnique({ where: { grade_field: { grade, field: field.id } } });
      if (exists) continue;
      const gradeCourse = grade === "konkur" ? null : bySlug.get(`riazi-${grade.slice(1)}-${field.id === "ensani" ? "ensani" : "tajrobi"}`);
      const topics = PATH_ORDER.map((slug) => bySlug.get(slug)).filter((c): c is NonNullable<typeof c> => !!c && c.fields.includes(field.id) && (c.grades.includes(grade) || (grade === "konkur" && (c.grades.includes("konkur") || c.grades.includes("g12")))));
      const steps = [...(gradeCourse ? [gradeCourse] : []), ...topics];
      if (steps.length === 0) continue;
      await prisma.classPath.create({
        data: {
          grade,
          field: field.id,
          title: `مسیر ${gradeLabel(grade)} · ${fieldLabel(field.id)}`,
          published: true,
          steps: { create: steps.map((c, i) => ({ courseId: c.id, sortOrder: i, note: i === 0 ? "از این‌جا شروع کن" : null })) },
        },
      });
      createdPaths++;
    }
  }
  console.log(`courses +${createdCourses} (catalog ${courses.length}), lessons +${createdLessons}, paths +${createdPaths}`);
  const { ensureDefaultChapters, readChapterCatalog } = await import("../lib/classes/bank-sync");
  const linked = await ensureDefaultChapters(await readChapterCatalog());
  console.log(`chapter links +${linked}`);
  console.log(`grades available for filters: ${GRADES.length}`);
  const premium = await upsertPremiumLessons();
  console.log(`premium lessons upserted: ${premium}`);
}

/** Upsert the named premium lessons by hash. Does not change other lessons or any course price. */
async function upsertPremiumLessons() {
  let n = 0;
  for (const item of PREMIUM_SEED_LESSONS) {
    const course = await prisma.classCourse.findUnique({ where: { slug: item.courseSlug } });
    if (!course) {
      console.warn(`course ${item.courseSlug} is missing; skipped ${item.aparatHash}`);
      continue;
    }
    const grades = [...new Set([...course.grades, ...item.grades])];
    if (grades.length !== course.grades.length || grades.some((g) => !course.grades.includes(g))) {
      await prisma.classCourse.update({ where: { id: course.id }, data: { grades } });
    }
    const data = {
      courseId: course.id,
      title: item.title,
      durationSec: item.durationSec,
      isPremium: true,
      sortOrder: item.sortOrder,
      grades: item.grades,
      poster: item.poster,
      published: true,
    };
    const existing = await prisma.classLesson.findUnique({ where: { aparatHash: item.aparatHash }, select: { id: true } });
    if (!existing) {
      await prisma.classLesson.create({
        data: { ...data, aparatHash: item.aparatHash, fields: course.fields, description: item.description },
      });
    } else {
      await prisma.classLesson.update({ where: { id: existing.id }, data });
    }
    n++;
  }
  return n;
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

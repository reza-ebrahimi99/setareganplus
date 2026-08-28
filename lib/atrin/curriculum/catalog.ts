/**
 * Seed curriculum catalog — structured content only.
 * Expand via import pipeline later; UI must never hardcode these strings.
 */

import type {
  CurriculumBook,
  CurriculumCatalog,
  CurriculumChapter,
  CurriculumExercise,
  CurriculumItem,
  CurriculumLesson,
  CurriculumTopicNode,
} from "@/lib/atrin/curriculum/types";
import type {
  EducationDifficulty,
  EducationGrade,
  EducationSubject,
} from "@/lib/atrin/education/types";

function item(partial: CurriculumItem): CurriculumItem {
  return partial;
}

function buildMathG8(): {
  books: CurriculumBook[];
  chapters: CurriculumChapter[];
  lessons: CurriculumLesson[];
  exercises: CurriculumExercise[];
  items: CurriculumItem[];
  topics: CurriculumTopicNode[];
} {
  const bookId = "book-math-8";
  const ch1 = "ch-math-8-1";
  const ch2 = "ch-math-8-2";
  const l1 = "les-math-8-1-1";
  const l2 = "les-math-8-1-2";
  const l3 = "les-math-8-2-1";
  const i1 = "item-math-8-frac";
  const i2 = "item-math-8-eq";
  const i3 = "item-math-8-geo";
  const e1 = "ex-math-8-1";
  const e2 = "ex-math-8-2";
  const e3 = "ex-math-8-3";
  const e4 = "ex-math-8-4";

  const books: CurriculumBook[] = [
    {
      id: bookId,
      title: "ریاضی هشتم",
      grade: 8,
      subject: "math",
      publisher: "سازمان پژوهش و برنامه‌ریزی آموزشی",
      chapterIds: [ch1, ch2],
    },
  ];

  const chapters: CurriculumChapter[] = [
    {
      id: ch1,
      bookId,
      title: "فصل ۱ — اعداد صحیح و گویا",
      order: 1,
      lessonIds: [l1, l2],
      pageStart: 1,
      pageEnd: 48,
    },
    {
      id: ch2,
      bookId,
      title: "فصل ۲ — هندسه و اندازه‌گیری",
      order: 2,
      lessonIds: [l3],
      pageStart: 49,
      pageEnd: 90,
    },
  ];

  const lessons: CurriculumLesson[] = [
    {
      id: l1,
      chapterId: ch1,
      bookId,
      title: "درس ۱ — کسرها",
      order: 1,
      pageStart: 8,
      pageEnd: 22,
      itemIds: [i1],
      learningObjectives: [
        "شناخت کسرهای ساده و مختلط",
        "جمع و تفریق کسرها",
      ],
    },
    {
      id: l2,
      chapterId: ch1,
      bookId,
      title: "درس ۲ — معادله‌های خطی",
      order: 2,
      pageStart: 23,
      pageEnd: 48,
      itemIds: [i2],
      learningObjectives: ["حل معادله درجه یک", "کاربرد در مسئله‌های کلامی"],
    },
    {
      id: l3,
      chapterId: ch2,
      bookId,
      title: "درس ۱ — مساحت و محیط",
      order: 1,
      pageStart: 49,
      pageEnd: 72,
      itemIds: [i3],
      learningObjectives: ["محاسبه مساحت مثلث و متوازی‌الاضلاع"],
    },
  ];

  const items: CurriculumItem[] = [
    item({
      id: i1,
      grade: 8,
      subject: "math",
      book: "ریاضی هشتم",
      bookId,
      chapter: "فصل ۱ — اعداد صحیح و گویا",
      chapterId: ch1,
      lesson: "درس ۱ — کسرها",
      lessonId: l1,
      pageStart: 8,
      pageEnd: 22,
      keywords: ["کسر", "fractions", "گویا", "صورت", "مخرج"],
      learningObjectives: ["جمع و تفریق کسرها"],
      relatedTopicIds: ["topic-frac-8"],
      prerequisiteIds: [],
      difficulty: "medium",
      examImportance: 4,
      giftedImportance: 3,
      konkurImportance: 2,
      estimatedStudyMinutes: 40,
      futureResources: [
        { id: "res-frac-video", kind: "video", title: "ویدیوی کسرها" },
        { id: "res-frac-faq", kind: "faq", title: "سوالات پرتکرار کسر" },
      ],
    }),
    item({
      id: i2,
      grade: 8,
      subject: "math",
      book: "ریاضی هشتم",
      bookId,
      chapter: "فصل ۱ — اعداد صحیح و گویا",
      chapterId: ch1,
      lesson: "درس ۲ — معادله‌های خطی",
      lessonId: l2,
      pageStart: 23,
      pageEnd: 48,
      keywords: ["معادله", "خطی", "equation", "x"],
      learningObjectives: ["حل معادله درجه یک"],
      relatedTopicIds: ["topic-eq-8"],
      prerequisiteIds: [i1],
      difficulty: "medium",
      examImportance: 5,
      giftedImportance: 4,
      konkurImportance: 3,
      estimatedStudyMinutes: 50,
      futureResources: [],
    }),
    item({
      id: i3,
      grade: 8,
      subject: "geometry",
      book: "ریاضی هشتم",
      bookId,
      chapter: "فصل ۲ — هندسه و اندازه‌گیری",
      chapterId: ch2,
      lesson: "درس ۱ — مساحت و محیط",
      lessonId: l3,
      pageStart: 49,
      pageEnd: 72,
      exerciseNumber: 4,
      keywords: ["مساحت", "محیط", "مثلث", "geometry", "صفحه ۷۲"],
      learningObjectives: ["مساحت مثلث"],
      relatedTopicIds: ["topic-area-8"],
      prerequisiteIds: [],
      difficulty: "easy",
      examImportance: 4,
      giftedImportance: 2,
      konkurImportance: 1,
      estimatedStudyMinutes: 35,
      futureResources: [
        { id: "res-geo-exam", kind: "exam", title: "نمونه سؤال مساحت" },
      ],
    }),
  ];

  const exercises: CurriculumExercise[] = [
    {
      id: e1,
      lessonId: l1,
      chapterId: ch1,
      bookId,
      number: 1,
      promptHint: "جمع دو کسر با مخرج مشترک",
      difficulty: "easy",
      itemId: i1,
    },
    {
      id: e2,
      lessonId: l1,
      chapterId: ch1,
      bookId,
      number: 2,
      promptHint: "تفریق کسرهای ناهم‌مخرج",
      difficulty: "medium",
      itemId: i1,
    },
    {
      id: e3,
      lessonId: l2,
      chapterId: ch1,
      bookId,
      number: 3,
      promptHint: "حل معادله ۲x + 5 = 17",
      difficulty: "medium",
      itemId: i2,
    },
    {
      id: e4,
      lessonId: l3,
      chapterId: ch2,
      bookId,
      number: 4,
      promptHint: "مساحت مثلث با قاعده و ارتفاع داده‌شده",
      difficulty: "easy",
      itemId: i3,
    },
  ];

  const topics: CurriculumTopicNode[] = [
    {
      id: "topic-frac-8",
      label: "کسرها",
      subject: "math",
      grade: 8,
      keywords: ["کسر", "fractions"],
      relatedTopicIds: ["topic-eq-8"],
      previousLessonId: null,
      nextLessonId: l2,
      exerciseIds: [e1, e2],
      videoResourceIds: ["res-frac-video"],
      faqResourceIds: ["res-frac-faq"],
      examQuestionIds: [],
      giftedQuestionIds: [],
      konkurQuestionIds: [],
    },
    {
      id: "topic-eq-8",
      label: "معادله خطی",
      subject: "math",
      grade: 8,
      keywords: ["معادله", "equation"],
      relatedTopicIds: ["topic-frac-8"],
      previousLessonId: l1,
      nextLessonId: l3,
      exerciseIds: [e3],
      videoResourceIds: [],
      faqResourceIds: [],
      examQuestionIds: [],
      giftedQuestionIds: [],
      konkurQuestionIds: [],
    },
    {
      id: "topic-area-8",
      label: "مساحت و محیط",
      subject: "geometry",
      grade: 8,
      keywords: ["مساحت", "محیط"],
      relatedTopicIds: [],
      previousLessonId: l2,
      nextLessonId: null,
      exerciseIds: [e4],
      videoResourceIds: [],
      faqResourceIds: [],
      examQuestionIds: ["res-geo-exam"],
      giftedQuestionIds: [],
      konkurQuestionIds: [],
    },
  ];

  return { books, chapters, lessons, exercises, items, topics };
}

function quickItem(opts: {
  id: string;
  grade: EducationGrade;
  subject: EducationSubject;
  book: string;
  bookId: string;
  chapter: string;
  chapterId: string;
  lesson: string;
  lessonId: string;
  pageStart: number;
  pageEnd: number;
  keywords: string[];
  difficulty?: EducationDifficulty;
  exerciseNumber?: number;
}): CurriculumItem {
  return item({
    id: opts.id,
    grade: opts.grade,
    subject: opts.subject,
    book: opts.book,
    bookId: opts.bookId,
    chapter: opts.chapter,
    chapterId: opts.chapterId,
    lesson: opts.lesson,
    lessonId: opts.lessonId,
    pageStart: opts.pageStart,
    pageEnd: opts.pageEnd,
    exerciseNumber: opts.exerciseNumber ?? null,
    keywords: opts.keywords,
    learningObjectives: [`هدف یادگیری: ${opts.lesson}`],
    relatedTopicIds: [],
    prerequisiteIds: [],
    difficulty: opts.difficulty ?? "medium",
    examImportance: 3,
    giftedImportance: 2,
    konkurImportance: opts.grade && opts.grade >= 10 ? 4 : 1,
    estimatedStudyMinutes: 30,
    futureResources: [],
  });
}

/** Lightweight cross-grade seeds so search/benchmarks have coverage. */
function buildCoverageSeeds(): CurriculumCatalog {
  const books: CurriculumBook[] = [];
  const chapters: CurriculumChapter[] = [];
  const lessons: CurriculumLesson[] = [];
  const exercises: CurriculumExercise[] = [];
  const items: CurriculumItem[] = [];
  const topics: CurriculumTopicNode[] = [];

  const seeds: Array<{
    grade: EducationGrade;
    subject: EducationSubject;
    title: string;
    keywords: string[];
    page: number;
  }> = [
    {
      grade: 1,
      subject: "persian",
      title: "فارسی اول",
      keywords: ["الفبا", "خواندن", "نوشتن"],
      page: 12,
    },
    {
      grade: 3,
      subject: "math",
      title: "ریاضی سوم",
      keywords: ["جمع", "تفریق", "ضرب"],
      page: 40,
    },
    {
      grade: 5,
      subject: "science",
      title: "علوم پنجم",
      keywords: ["گیاه", "جانور", "آزمایش"],
      page: 55,
    },
    {
      grade: 6,
      subject: "english",
      title: "انگلیسی ششم",
      keywords: ["vocabulary", "grammar", "vocabulary"],
      page: 20,
    },
    {
      grade: 7,
      subject: "arabic",
      title: "عربی هفتم",
      keywords: ["صرف", "نحو", "ترجمه"],
      page: 33,
    },
    {
      grade: 9,
      subject: "physics",
      title: "فیزیک نهم",
      keywords: ["نیرو", "حرکت", "انرژی"],
      page: 61,
    },
    {
      grade: 10,
      subject: "chemistry",
      title: "شیمی دهم",
      keywords: ["مول", "واکنش", "جدول تناوبی", "H2O"],
      page: 72,
    },
    {
      grade: 11,
      subject: "biology",
      title: "زیست یازدهم",
      keywords: ["سلول", "ژن", "فتوسنتز"],
      page: 88,
    },
    {
      grade: 12,
      subject: "konkur",
      title: "جمع‌بندی کنکور",
      keywords: ["کنکور", "تست", "رتبه"],
      page: 100,
    },
    {
      grade: 6,
      subject: "gifted",
      title: "آمادگی تیزهوشان",
      keywords: ["تیزهوشان", "استعداد"],
      page: 15,
    },
    {
      grade: 10,
      subject: "programming",
      title: "مبانی برنامه‌نویسی",
      keywords: ["الگوریتم", "پایتون", "حلقه"],
      page: 10,
    },
  ];

  for (const s of seeds) {
    const bookId = `book-${s.subject}-${s.grade}`;
    const chapterId = `ch-${s.subject}-${s.grade}-1`;
    const lessonId = `les-${s.subject}-${s.grade}-1`;
    const itemId = `item-${s.subject}-${s.grade}-1`;
    const topicId = `topic-${s.subject}-${s.grade}`;
    const exId = `ex-${s.subject}-${s.grade}-1`;

    books.push({
      id: bookId,
      title: s.title,
      grade: s.grade,
      subject: s.subject,
      chapterIds: [chapterId],
    });
    chapters.push({
      id: chapterId,
      bookId,
      title: `فصل ۱ — ${s.title}`,
      order: 1,
      lessonIds: [lessonId],
      pageStart: 1,
      pageEnd: s.page + 20,
    });
    lessons.push({
      id: lessonId,
      chapterId,
      bookId,
      title: "درس ۱",
      order: 1,
      pageStart: Math.max(1, s.page - 5),
      pageEnd: s.page + 5,
      itemIds: [itemId],
      learningObjectives: [`آشنایی با ${s.keywords[0]}`],
    });
    items.push(
      quickItem({
        id: itemId,
        grade: s.grade,
        subject: s.subject,
        book: s.title,
        bookId,
        chapter: `فصل ۱ — ${s.title}`,
        chapterId,
        lesson: "درس ۱",
        lessonId,
        pageStart: Math.max(1, s.page - 5),
        pageEnd: s.page + 5,
        keywords: s.keywords,
        exerciseNumber: 1,
      }),
    );
    exercises.push({
      id: exId,
      lessonId,
      chapterId,
      bookId,
      number: 1,
      promptHint: s.keywords.join(" / "),
      difficulty: "medium",
      itemId,
    });
    topics.push({
      id: topicId,
      label: s.keywords[0] ?? s.title,
      subject: s.subject,
      grade: s.grade,
      keywords: s.keywords,
      relatedTopicIds: [],
      previousLessonId: null,
      nextLessonId: null,
      exerciseIds: [exId],
      videoResourceIds: [],
      faqResourceIds: [],
      examQuestionIds: [],
      giftedQuestionIds: [],
      konkurQuestionIds: [],
    });
  }

  return { books, chapters, lessons, exercises, items, topics };
}

export function createSeedCurriculumCatalog(): CurriculumCatalog {
  const math = buildMathG8();
  const coverage = buildCoverageSeeds();
  return {
    books: [...math.books, ...coverage.books],
    chapters: [...math.chapters, ...coverage.chapters],
    lessons: [...math.lessons, ...coverage.lessons],
    exercises: [...math.exercises, ...coverage.exercises],
    items: [...math.items, ...coverage.items],
    topics: [...math.topics, ...coverage.topics],
  };
}

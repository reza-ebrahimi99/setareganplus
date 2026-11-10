/** Premium lessons the seed upserts by video hash. Other lessons are left untouched. */
export type PremiumSeedLesson = {
  courseSlug: string;
  aparatHash: string;
  title: string;
  durationSec: number;
  /** Order among premium lessons of the course. Lower comes first. */
  sortOrder: number;
  grades: string[];
  /** Public path, for example /classes/covers/…. */
  poster: string;
  description: string;
};

export const PREMIUM_SEED_LESSONS: PremiumSeedLesson[] = [
  {
    courseSlug: "moadele",
    aparatHash: "orw02g2",
    title: "معادله درجه ۲ - قسمت اول",
    durationSec: 48 * 60 + 43,
    sortOrder: 0,
    grades: ["g9", "g10", "g11", "g12"],
    poster: "/classes/covers/moadele-1-premium.png",
    description: "قسمت اول معادله درجه ۲ در سری ستارگان پلاس پریمیوم. مناسب پایه نهم تا دوازدهم.",
  },
  {
    courseSlug: "moadele",
    aparatHash: "usq84k4",
    title: "معادله درجه ۲ - قسمت دوم",
    durationSec: 16 * 60 + 9,
    sortOrder: 1,
    grades: ["g9", "g10", "g11", "g12"],
    poster: "/classes/covers/moadele-2-premium.png",
    description: "قسمت دوم معادله درجه ۲ در سری ستارگان پلاس پریمیوم. مناسب پایه نهم تا دوازدهم.",
  },
];

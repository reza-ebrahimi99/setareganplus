/**
 * Student 360° Profile — section field definitions (architecture + editable).
 */

import type { StudentProfileSectionDef } from "@/lib/guidance/profile360/types";

export const STUDENT_PROFILE_SECTIONS: readonly StudentProfileSectionDef[] = [
  {
    id: "personal",
    title: "اطلاعات فردی",
    description: "هویت پایه برای پرونده هدایت تحصیلی.",
    icon: "user",
    accent: "teal",
    fields: [
      { id: "fullName", label: "نام و نام خانوادگی", type: "text", required: true },
      { id: "birthDate", label: "تاریخ تولد", type: "date" },
      { id: "city", label: "شهر محل سکونت", type: "text", required: true },
      { id: "phone", label: "شماره تماس", type: "tel" },
    ],
  },
  {
    id: "academic",
    title: "اطلاعات تحصیلی",
    description: "پایه، سال تحصیلی و مسیر کنکور.",
    icon: "book",
    accent: "blue",
    fields: [
      { id: "gradeName", label: "پایه تحصیلی", type: "text", required: true },
      { id: "schoolYear", label: "سال تحصیلی", type: "text" },
      { id: "schoolName", label: "نام مدرسه", type: "text" },
      {
        id: "examGroup",
        label: "گروه آزمایشی",
        type: "select",
        required: true,
        options: [
          { id: "MATHEMATICS", label: "ریاضی" },
          { id: "EXPERIMENTAL_SCIENCES", label: "تجربی" },
          { id: "HUMANITIES", label: "انسانی" },
          { id: "ARTS", label: "هنر" },
          { id: "LANGUAGES", label: "زبان" },
        ],
      },
    ],
  },
  {
    id: "family",
    title: "اطلاعات خانواده",
    description: "سرپرست و ارتباط خانوادگی برای هماهنگی.",
    icon: "users",
    accent: "orange",
    fields: [
      { id: "guardianName", label: "نام سرپرست", type: "text", required: true },
      { id: "guardianRelation", label: "نسبت", type: "text" },
      { id: "guardianPhone", label: "تماس سرپرست", type: "tel", required: true },
      { id: "familyNotes", label: "توضیح کوتاه", type: "textarea" },
    ],
  },
  {
    id: "educational_goals",
    title: "اهداف تحصیلی",
    description: "کوتاه‌مدت و بلندمدت.",
    icon: "route",
    accent: "gold",
    fields: [
      { id: "shortTerm", label: "هدف کوتاه‌مدت", type: "textarea", required: true },
      { id: "longTerm", label: "هدف بلندمدت", type: "textarea", required: true },
      { id: "dreamMajor", label: "رشته رؤیایی", type: "text" },
    ],
  },
  {
    id: "university_preferences",
    title: "ترجیحات دانشگاهی",
    description: "شهرها و نوع دانشگاه مورد علاقه.",
    icon: "layers",
    accent: "purple",
    fields: [
      { id: "preferredCities", label: "شهرهای مورد علاقه", type: "tags" },
      { id: "universityTypes", label: "نوع دانشگاه", type: "tags" },
      { id: "notes", label: "یادداشت", type: "textarea" },
    ],
  },
  {
    id: "study_habits",
    title: "عادات مطالعه",
    description: "ریتم و روش یادگیری روزمره.",
    icon: "clipboard",
    accent: "blue",
    fields: [
      { id: "hoursPerDay", label: "ساعات مطالعه در روز", type: "text" },
      { id: "preferredTime", label: "زمان ترجیحی", type: "text" },
      { id: "method", label: "روش مطالعه", type: "textarea" },
    ],
  },
  {
    id: "strengths",
    title: "نقاط قوت",
    description: "توانایی‌هایی که به آن‌ها تکیه می‌کنی.",
    icon: "medal",
    accent: "emerald",
    fields: [
      { id: "items", label: "نقاط قوت", type: "tags", required: true },
    ],
  },
  {
    id: "weaknesses",
    title: "نقاط قابل بهبود",
    description: "حوزه‌هایی برای رشد.",
    icon: "chart",
    accent: "orange",
    fields: [
      { id: "items", label: "نقاط قابل بهبود", type: "tags" },
    ],
  },
  {
    id: "learning_challenges",
    title: "چالش‌های یادگیری",
    description: "موانعی که مسیر مطالعه را سخت می‌کند.",
    icon: "shield",
    accent: "pink",
    fields: [
      { id: "items", label: "چالش‌ها", type: "tags" },
      { id: "notes", label: "توضیح", type: "textarea" },
    ],
  },
  {
    id: "achievements",
    title: "دستاوردها",
    description: "موفقیت‌ها و افتخارات ثبت‌شده.",
    icon: "trophy",
    accent: "gold",
    fields: [
      { id: "items", label: "دستاوردها", type: "tags" },
    ],
  },
  {
    id: "languages",
    title: "زبان‌ها",
    description: "زبان‌هایی که بلد هستی.",
    icon: "message",
    accent: "teal",
    fields: [
      { id: "items", label: "زبان‌ها", type: "tags", required: true },
    ],
  },
  {
    id: "skills",
    title: "مهارت‌ها",
    description: "مهارت‌های نرم و سخت.",
    icon: "spark",
    accent: "purple",
    fields: [
      { id: "items", label: "مهارت‌ها", type: "tags" },
    ],
  },
  {
    id: "extracurricular",
    title: "فعالیت‌های فوق‌برنامه",
    description: "باشگاه‌ها، داوطلبی، پروژه‌ها.",
    icon: "calendar",
    accent: "blue",
    fields: [
      { id: "items", label: "فعالیت‌ها", type: "tags" },
    ],
  },
  {
    id: "future_documents",
    title: "مدارک آینده",
    description: "جایگاه مدارک تکمیلی — معماری آماده.",
    icon: "layers",
    accent: "gold",
    architectureOnly: true,
    fields: [
      {
        id: "placeholder",
        label: "مدارک",
        type: "text",
        documentSlot: true,
        placeholder: "به‌زودی",
      },
    ],
  },
  {
    id: "emergency_contacts",
    title: "تماس اضطراری",
    description: "فرد قابل دسترس در شرایط ضروری.",
    icon: "bell",
    accent: "orange",
    fields: [
      { id: "name", label: "نام", type: "text", required: true },
      { id: "relation", label: "نسبت", type: "text" },
      { id: "phone", label: "شماره تماس", type: "tel", required: true },
    ],
  },
];

export function getProfileSectionDef(id: string) {
  return STUDENT_PROFILE_SECTIONS.find((s) => s.id === id);
}

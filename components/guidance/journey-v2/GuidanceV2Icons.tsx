import type { ReactNode } from "react";

export function RequiredStar() {
  return (
    <span
      className="gjv2-required"
      title="این فیلد اجباری است"
      aria-label="اجباری"
    >
      ★
    </span>
  );
}

export function ExamGroupIcon({
  type,
}: {
  type: "experimental" | "math" | "humanities" | "art" | "language";
}) {
  const icons: Record<typeof type, ReactNode> = {
    experimental: "⚗️",
    math: "🧮",
    humanities: "📖",
    art: "🎨",
    language: "🌐",
  };

  return <span className="gjv2-choice-icon">{icons[type]}</span>;
}

export function SubjectIcon({ label }: { label: string }) {
  return (
    <span className="gjv2-subject-icon" aria-hidden="true">
      {resolveSubjectIcon(label)}
    </span>
  );
}

function resolveSubjectIcon(label: string): ReactNode {
  if (/فارسی|ادبیات|علوم و فنون/.test(label)) return "✍️";
  if (/عربی/.test(label)) return "🔤";
  if (/دین|دینی|قرآن|معارف/.test(label)) return "📖";
  if (/انگلیسی|زبان/.test(label)) return "🌐";

  if (/ریاضی|حسابان/.test(label)) return "π";
  if (/هندسه/.test(label)) return "📐";
  if (/گسسته/.test(label)) return "🔢";
  if (/آمار|احتمال/.test(label)) return "📊";

  if (/فیزیک/.test(label)) return "🧲";
  if (/شیمی/.test(label)) return "⚗️";
  if (/زیست/.test(label)) return "🌿";
  if (/زمین/.test(label)) return "⛰️";

  if (/سلامت|بهداشت/.test(label)) return "❤️";
  if (/اجتماعی|جامعه/.test(label)) return "👥";
  if (/تاریخ/.test(label)) return "🏛️";
  if (/جغرافیا/.test(label)) return "🗺️";
  if (/اقتصاد/.test(label)) return "📈";
  if (/فلسفه/.test(label)) return "🧠";
  if (/منطق/.test(label)) return "🧩";
  if (/روان/.test(label)) return "🧠";

  return "📘";
}

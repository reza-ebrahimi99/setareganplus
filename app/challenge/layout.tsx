import type { Metadata } from "next";
import "@/styles/challenge.css";

export const metadata: Metadata = {
  title: {
    default: "چالش ۵ نفره ریاضی",
    template: "%s | چالش ۵ نفره ریاضی",
  },
  description:
    "با چهار دوستت یک تیم بساز، آزمون ریاضی را کامل کن و نتیجه، جایزه و گواهی تیم را بگیر.",
};

export default function ChallengeLayout({ children }: { children: React.ReactNode }) {
  return children;
}


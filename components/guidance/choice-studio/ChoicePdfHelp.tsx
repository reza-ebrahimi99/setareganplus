"use client";

import { useState } from "react";
import { CHATGPT_PDF_PROMPT } from "@/lib/guidance/choice-studio/types";

export function ChoicePdfHelp() {
  const [copied, setCopied] = useState(false);

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(CHATGPT_PDF_PROMPT);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className="gcs-help" id="pdf-help">
      <h2>تبدیل فایل PDF به اکسل با ChatGPT</h2>
      <ol>
        <li>فایل PDF انتخاب رشته را در ChatGPT بارگذاری کنید.</li>
        <li>متن آماده زیر را ارسال کنید.</li>
        <li>فایل XLSX تولیدشده را قبل از ورود به استودیو یک‌بار مرور کنید.</li>
        <li>تبدیل خودکار خطاناپذیر نیست؛ پیش‌نمایش استودیو مرجع نهایی است.</li>
      </ol>
      <pre className="gcs-help__prompt">{CHATGPT_PDF_PROMPT}</pre>
      <button type="button" className="gcs-btn gcs-btn--gold" onClick={() => void copyPrompt()}>
        {copied ? "کپی شد" : "کپی متن راهنما"}
      </button>
    </section>
  );
}

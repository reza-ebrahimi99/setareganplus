"use client";

export function WorkspacePrintButton() {
  const handlePrint = () => {
    const el = document.querySelector(".counselor-report");
    if (!el) { window.print(); return; }
    const w = window.open("", "_blank", "width=950,height=1000");
    if (!w) { window.print(); return; }
    const cloned = el.cloneNode(true) as HTMLElement;
    cloned.querySelectorAll(".counselor-report__print, button, .counselor-report__hint").forEach((x) => x.remove());

    const css = `
      * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      @page { size: A4 portrait; margin: 8mm 10mm; }
      body { margin: 0; padding: 0; font-family: Tahoma, Arial, sans-serif; direction: rtl; font-size: 11px; line-height: 1.4; color: #0f172a; width: 100%; }
      .counselor-report { width: 100% !important; max-width: 100% !important; margin: 0 !important; padding: 0 !important; }

      /* سربرگ‌ها */
      .counselor-report__letterhead, .counselor-casebook__cover {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        border-bottom: 2px solid #0f172a;
        padding-bottom: 8px;
        margin-bottom: 12px;
      }
      .counselor-casebook__cover h1, h1 {
        font-size: 15px;
        font-weight: 800;
        margin: 6px 0 10px 0;
        color: #0f172a;
      }
      .counselor-casebook__cover dl {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 6px 12px;
        width: 100%;
        background: #f8fafc;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        padding: 8px 12px;
        margin: 0;
      }
      .counselor-casebook__cover dl div {
        display: flex;
        justify-content: space-between;
        border-bottom: 1px dashed #e2e8f0;
        padding-bottom: 2px;
      }

      /* بخش‌های اطلاعات پرونده (Casebook) */
      .counselor-casebook section, .counselor-casebook__section {
        margin-top: 14px;
        page-break-inside: avoid;
        break-inside: avoid;
      }
      .counselor-casebook h2, .counselor-casebook h3 {
        font-size: 12px;
        font-weight: bold;
        border-right: 3px solid #6366f1;
        padding-right: 6px;
        margin: 8px 0 6px 0;
        color: #1e293b;
      }
      .counselor-casebook dl {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 4px 14px;
        background: #fdfdfd;
        border: 1px solid #e2e8f0;
        border-radius: 4px;
        padding: 6px 10px;
        margin: 4px 0 10px 0;
      }
      .counselor-casebook dl div {
        display: flex;
        justify-content: space-between;
        border-bottom: 1px dotted #cbd5e1;
        padding: 3px 0;
      }
      .counselor-casebook dt { font-weight: bold; color: #475569; }
      .counselor-casebook dd { margin: 0; color: #0f172a; }

      /* جداول نمرات و لیست‌ها */
      .counselor-casebook table, table {
        width: 100%;
        border-collapse: collapse;
        margin: 6px 0;
      }
      .counselor-casebook th, .counselor-casebook td, th, td {
        border: 1px solid #cbd5e1;
        padding: 4px 6px;
        font-size: 10.5px;
        text-align: right;
      }
      .counselor-casebook th, th {
        background: #f1f5f9;
        font-weight: bold;
      }

      /* بخش برگه کار (Worksheet) */
      .counselor-worksheet__meta {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 4px 12px;
        background: #f8fafc;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        padding: 6px 10px;
        margin-bottom: 8px;
      }
      .counselor-worksheet__meta div {
        display: flex;
        justify-content: space-between;
        border-bottom: 1px dashed #e2e8f0;
        padding-bottom: 2px;
      }
      .counselor-worksheet__meta dt { font-weight: bold; color: #475569; }
      .counselor-worksheet__blank { letter-spacing: 1px; color: #94a3b8; }
      .counselor-worksheet__block { margin-top: 6px; page-break-inside: avoid; }
      .counselor-worksheet__block h2 { font-size: 11px; font-weight: bold; margin: 4px 0 2px 0; }
      .counselor-worksheet__dots { display: flex; flex-direction: column; gap: 11px; padding: 2px 0 4px 0; }
      .counselor-worksheet__dots span { display: block; width: 100%; height: 1px; border-bottom: 1px dotted #94a3b8; }
      .counselor-worksheet__signs { display: flex; justify-content: space-around; margin-top: 20px; page-break-inside: avoid; }
      .counselor-worksheet__signs em { display: block; width: 160px; height: 35px; border-bottom: 1px dashed #94a3b8; margin-top: 4px; }
    `;

    const html = "<!DOCTYPE html><html dir=\"rtl\" lang=\"fa\"><head><meta charset=\"utf-8\" /><title>گزارش مشاوره</title><style>" + css + "</style></head><body>" + cloned.outerHTML + "</body></html>";
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); w.close(); }, 400);
  };

  return (
    <button type="button" className="counselor-report__print" onClick={handlePrint}>
      ذخیره PDF / چاپ
    </button>
  );
}

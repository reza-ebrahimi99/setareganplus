import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { prisma } from "@/lib/prisma";
import { jalaliDateTime } from "@/lib/format";
import { ACCESS_ALPHABET } from "@/lib/consult/constants";
import { siteUrl } from "@/lib/shop/config";

function code() {
  const bytes = randomBytes(8);
  let out = "";
  for (let i = 0; i < 8; i++) out += ACCESS_ALPHABET[bytes[i] % ACCESS_ALPHABET.length];
  return `${out.slice(0, 4)}-${out.slice(4)}`;
}

export async function issueCertificate(studentId: string, courseId: string) {
  const existing = await prisma.classCertificate.findUnique({ where: { studentId_courseId: { studentId, courseId } } });
  if (existing) return existing;
  for (let i = 0; i < 4; i++) {
    try {
      return await prisma.classCertificate.create({ data: { studentId, courseId, code: code() } });
    } catch {
      /* code collision, try again */
    }
  }
  return null;
}

export async function certificatePdf(row: { code: string; issuedAt: Date; student: { firstName: string; lastName: string }; course: { title: string; teacher: string } }) {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const page = pdf.addPage([842, 595]);
  const fontBytes = await readFile(path.join(process.cwd(), "assets/fonts/Vazirmatn-Regular.ttf"));
  const font = await pdf.embedFont(fontBytes, { subset: true });
  const logoBytes = await readFile(path.join(process.cwd(), "public/brand/logo.png"));
  const logo = await pdf.embedPng(logoBytes);
  const { width, height } = page.getSize();
  page.drawRectangle({ x: 18, y: 18, width: width - 36, height: height - 36, borderColor: rgb(0.96, 0.7, 0.11), borderWidth: 3 });
  page.drawRectangle({ x: 28, y: 28, width: width - 56, height: height - 56, borderColor: rgb(0.04, 0.1, 0.25), borderWidth: 1 });
  const logoW = 72;
  page.drawImage(logo, { x: width / 2 - logoW / 2, y: height - 130, width: logoW, height: logoW * (logo.height / logo.width) });

  // Logical Persian. PDF viewers apply the bidi algorithm; pre-reversing breaks it.
  const draw = (text: string, y: number, size: number, color = rgb(0.04, 0.1, 0.25)) => {
    const w = font.widthOfTextAtSize(text, size);
    page.drawText(text, { x: Math.max(36, (width - w) / 2), y, size, font, color });
  };
  draw("ستارگان پلاس", height - 168, 14, rgb(0.48, 0.34, 0));
  draw("گواهی پایان دوره", height - 210, 32);
  draw(`${row.student.firstName} ${row.student.lastName}`, height - 270, 26);
  draw(`دورهٔ ${row.course.title}`, height - 318, 18);
  draw(`مدرس: ${row.course.teacher}`, height - 350, 13, rgb(0.35, 0.39, 0.47));
  draw(jalaliDateTime(row.issuedAt), height - 390, 12, rgb(0.35, 0.39, 0.47));
  const latin = `Code ${row.code}`;
  const lw = font.widthOfTextAtSize(latin, 14);
  page.drawText(latin, { x: (width - lw) / 2, y: 120, size: 14, font, color: rgb(0.04, 0.1, 0.25) });
  const url = siteUrl() + "/classes/certificate/" + row.code;
  const uw = font.widthOfTextAtSize(url, 10);
  page.drawText(url, { x: (width - uw) / 2, y: 96, size: 10, font, color: rgb(0.18, 0.36, 0.92) });
  return Buffer.from(await pdf.save());
}

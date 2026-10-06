import sharp from "sharp";
import { ChallengeCertificateStatus } from "@/generated/prisma/enums";
import { getChallengePublicOrigin } from "@/lib/challenge/host";
import { prisma } from "@/lib/prisma";

function xml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export async function getPublicChallengeCertificate(code: string) {
  const normalized = code.trim().toUpperCase();
  if (!/^[A-Z0-9]{10,20}$/.test(normalized)) return null;
  return prisma.challengeCertificate.findFirst({
    where: {
      verificationCode: normalized,
      status: ChallengeCertificateStatus.ISSUED,
      revokedAt: null,
    },
    select: {
      verificationCode: true,
      serialNumber: true,
      issuedAt: true,
      metadata: true,
      participant: { select: { fullName: true, gradeLabel: true } },
      team: {
        select: {
          name: true,
          averagePercentage: true,
          scholarshipTier: { select: { title: true, prizeLabel: true } },
        },
      },
      campaign: {
        select: {
          title: true,
          certificateTitle: true,
          certificateSubtitle: true,
          certificateSignatory: true,
          certificateRole: true,
        },
      },
    },
  });
}

type Certificate = NonNullable<
  Awaited<ReturnType<typeof getPublicChallengeCertificate>>
>;

function faDate(value: Date): string {
  return new Intl.DateTimeFormat("fa-IR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Tehran",
  }).format(value);
}

export function buildChallengeCertificateSvg(certificate: Certificate): string {
  const verifyUrl = `${getChallengePublicOrigin()}/certificate/${certificate.verificationCode}`;
  const score = Math.round(certificate.team.averagePercentage ?? 0).toLocaleString("fa-IR");
  const tier = certificate.team.scholarshipTier?.title ?? "تکمیل موفق چالش";
  const prize = certificate.team.scholarshipTier?.prizeLabel ?? "گواهی حضور";
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1131" viewBox="0 0 1600 1131">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#f8fbff"/>
      <stop offset="1" stop-color="#f3f0ff"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#2463eb"/>
      <stop offset="1" stop-color="#7c3aed"/>
    </linearGradient>
  </defs>
  <rect width="1600" height="1131" fill="url(#bg)"/>
  <circle cx="80" cy="100" r="230" fill="#2463eb" opacity="0.06"/>
  <circle cx="1530" cy="1050" r="300" fill="#7c3aed" opacity="0.07"/>
  <rect x="42" y="42" width="1516" height="1047" rx="34" fill="none" stroke="#172554" stroke-width="3"/>
  <rect x="62" y="62" width="1476" height="1007" rx="27" fill="none" stroke="#93a7ca" stroke-width="1.5"/>
  <rect x="600" y="82" width="400" height="10" rx="5" fill="url(#accent)"/>
  <text x="800" y="160" text-anchor="middle" font-family="DejaVu Sans" font-size="28" fill="#4f5f7a" direction="rtl">مجموعه آموزشی ستارگان پلاس</text>
  <text x="800" y="255" text-anchor="middle" font-family="DejaVu Sans" font-weight="700" font-size="64" fill="#172554" direction="rtl">${xml(certificate.campaign.certificateTitle)}</text>
  <text x="800" y="325" text-anchor="middle" font-family="DejaVu Sans" font-size="28" fill="#52627d" direction="rtl">${xml(certificate.campaign.certificateSubtitle)}</text>
  <text x="800" y="415" text-anchor="middle" font-family="DejaVu Sans" font-size="27" fill="#52627d" direction="rtl">این گواهی تقدیم می‌شود به</text>
  <text x="800" y="505" text-anchor="middle" font-family="DejaVu Sans" font-weight="700" font-size="70" fill="#1d4ed8" direction="rtl">${xml(certificate.participant.fullName)}</text>
  <rect x="360" y="550" width="880" height="2" fill="#c7d2e9"/>
  <text x="800" y="625" text-anchor="middle" font-family="DejaVu Sans" font-size="30" fill="#263858" direction="rtl">برای حضور و تکمیل ${xml(certificate.campaign.title)}</text>
  <text x="800" y="680" text-anchor="middle" font-family="DejaVu Sans" font-size="25" fill="#52627d" direction="rtl">${xml(certificate.team.name)} · ${xml(certificate.participant.gradeLabel)} · امتیاز تیم ${score}٪</text>
  <g transform="translate(490 735)">
    <rect width="280" height="74" rx="37" fill="#e9efff"/>
    <text x="140" y="48" text-anchor="middle" font-family="DejaVu Sans" font-weight="700" font-size="25" fill="#1d4ed8" direction="rtl">${xml(tier)}</text>
  </g>
  <g transform="translate(790 735)">
    <rect width="320" height="74" rx="37" fill="#f2eaff"/>
    <text x="160" y="48" text-anchor="middle" font-family="DejaVu Sans" font-weight="700" font-size="25" fill="#6d28d9" direction="rtl">${xml(prize)}</text>
  </g>
  <text x="285" y="915" text-anchor="middle" font-family="DejaVu Sans" font-weight="700" font-size="25" fill="#172554" direction="rtl">${xml(certificate.campaign.certificateSignatory)}</text>
  <text x="285" y="955" text-anchor="middle" font-family="DejaVu Sans" font-size="20" fill="#64748b" direction="rtl">${xml(certificate.campaign.certificateRole)}</text>
  <line x1="165" y1="865" x2="405" y2="865" stroke="#94a3b8"/>
  <text x="1315" y="900" text-anchor="middle" font-family="DejaVu Sans" font-size="20" fill="#64748b" direction="rtl">تاریخ صدور: ${xml(faDate(certificate.issuedAt))}</text>
  <text x="1315" y="940" text-anchor="middle" font-family="DejaVu Sans" font-size="18" fill="#64748b">${xml(certificate.serialNumber)}</text>
  <text x="800" y="1022" text-anchor="middle" font-family="DejaVu Sans" font-size="17" fill="#71809a" direction="rtl">اعتبارسنجی: ${xml(verifyUrl)} · کد ${xml(certificate.verificationCode)}</text>
</svg>`;
}

export async function renderChallengeCertificatePng(
  certificate: Certificate,
): Promise<Buffer> {
  return sharp(Buffer.from(buildChallengeCertificateSvg(certificate)))
    .png({ compressionLevel: 9 })
    .toBuffer();
}

function jpegPdf(jpeg: Buffer, width: number, height: number): Buffer {
  const header = Buffer.from("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n", "binary");
  const content = Buffer.from("q\n842 0 0 595 0 0 cm\n/Im0 Do\nQ\n");
  const objects = [
    Buffer.from("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"),
    Buffer.from("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"),
    Buffer.from(
      "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n",
    ),
    Buffer.concat([
      Buffer.from(
        `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`,
      ),
      jpeg,
      Buffer.from("\nendstream\nendobj\n"),
    ]),
    Buffer.concat([
      Buffer.from(`5 0 obj\n<< /Length ${content.length} >>\nstream\n`),
      content,
      Buffer.from("endstream\nendobj\n"),
    ]),
  ];
  const offsets: number[] = [0];
  let cursor = header.length;
  for (const object of objects) {
    offsets.push(cursor);
    cursor += object.length;
  }
  const xrefOffset = cursor;
  const xref = Buffer.from(
    `xref\n0 6\n0000000000 65535 f \n${offsets
      .slice(1)
      .map((offset) => `${String(offset).padStart(10, "0")} 00000 n `)
      .join("\n")}\ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`,
  );
  return Buffer.concat([header, ...objects, xref]);
}

export async function renderChallengeCertificatePdf(
  certificate: Certificate,
): Promise<Buffer> {
  const jpeg = await sharp(Buffer.from(buildChallengeCertificateSvg(certificate)))
    .flatten({ background: "#ffffff" })
    .jpeg({ quality: 94, chromaSubsampling: "4:4:4" })
    .toBuffer();
  return jpegPdf(jpeg, 1600, 1131);
}


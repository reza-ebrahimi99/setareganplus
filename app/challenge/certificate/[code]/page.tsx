import { notFound } from "next/navigation";
import { ChallengeShell } from "@/components/challenge/ChallengeShell";
import { getPublicChallengeCertificate } from "@/lib/challenge/certificate";

type Props = { params: Promise<{ code: string }> };

export async function generateMetadata({ params }: Props) {
  const { code } = await params;
  const certificate = await getPublicChallengeCertificate(code);
  return {
    title: certificate ? `گواهی ${certificate.participant.fullName}` : "استعلام گواهی",
    robots: { index: false, follow: false },
  };
}

export default async function ChallengeCertificatePage({ params }: Props) {
  const { code } = await params;
  const certificate = await getPublicChallengeCertificate(code);
  if (!certificate) notFound();
  const issued = new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "long",
    timeZone: "Asia/Tehran",
  }).format(certificate.issuedAt);

  return (
    <ChallengeShell compact>
      <div className="challenge-container">
        <header className="challenge-page-head">
          <div><span className="challenge-eyebrow">گواهی معتبر</span><h1>{certificate.participant.fullName}</h1><p>{certificate.campaign.title}</p></div>
        </header>
        <section className="challenge-card" style={{ padding: 10, overflow: "hidden" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/certificate/${certificate.verificationCode}/image`}
            alt={`گواهی ${certificate.participant.fullName}`}
            style={{ display: "block", width: "100%", borderRadius: 16 }}
          />
        </section>
        <div className="challenge-share-actions">
          <a className="challenge-button challenge-button-primary" href={`/certificate/${certificate.verificationCode}/pdf`} download>دانلود PDF</a>
          <a className="challenge-button challenge-button-secondary" href={`/certificate/${certificate.verificationCode}/image`} download>دانلود تصویر</a>
        </div>
        <section className="challenge-card" style={{ marginTop: 14 }}>
          <h2 className="challenge-card-title">استعلام اصالت</h2>
          <p className="challenge-card-sub">این گواهی معتبر است و در تاریخ {issued} صادر شده.</p>
          <div className="challenge-stat-grid">
            <div className="challenge-card challenge-stat"><small>شماره سریال</small><strong style={{ fontSize: 14 }} dir="ltr">{certificate.serialNumber}</strong></div>
            <div className="challenge-card challenge-stat"><small>کد استعلام</small><strong style={{ fontSize: 14 }} dir="ltr">{certificate.verificationCode}</strong></div>
          </div>
        </section>
      </div>
    </ChallengeShell>
  );
}


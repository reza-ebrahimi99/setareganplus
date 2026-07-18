import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { PageHero } from "@/components/ui/PageHero";
import { SiteShell } from "@/components/layout/SiteShell";
import { loadPublicTeamMemberBySlug } from "@/lib/website/load-team";
import { siteConfig } from "@/content/site";

/** Member pages refresh via revalidatePath after admin edits. */
export const revalidate = 120;

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const member = await loadPublicTeamMemberBySlug(slug);
  if (!member) {
    return { title: "عضو تیم یافت نشد" };
  }

  const title = member.seoTitle?.trim() || `${member.fullName} | تیم ستارگان`;
  const description =
    member.seoDescription?.trim() ||
    `${member.fullName}، ${member.roleTitle} در ${member.departmentName} — مؤسسه علمی ستارگان`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "profile",
      ...(member.portraitUrl
        ? { images: [{ url: member.portraitUrl, alt: member.portraitAlt }] }
        : {}),
    },
  };
}

export default async function TeamMemberPage({ params }: PageProps) {
  const { slug } = await params;
  const member = await loadPublicTeamMemberBySlug(slug);
  if (!member) notFound();

  const personJsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: member.fullName,
    jobTitle: member.roleTitle,
    description: member.biography || undefined,
    image: member.portraitUrl || undefined,
    email: member.email || undefined,
    telephone: member.phone || undefined,
    url: member.websiteUrl || undefined,
    worksFor: {
      "@type": "Organization",
      name: "مؤسسه علمی ستارگان",
      alternateName: siteConfig.name,
    },
    sameAs: [member.instagramUrl, member.linkedinUrl, member.websiteUrl].filter(
      Boolean,
    ),
  };

  return (
    <SiteShell activePath="/team">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
      />
      <PageHero
        title={member.fullName}
        subtitle={`${member.roleTitle} · ${member.departmentName}`}
        breadcrumbs={[
          { label: "صفحه اصلی", href: "/" },
          { label: "تیم ما", href: "/team" },
          { label: member.fullName },
        ]}
      />
      <Container className="py-10 sm:py-14">
        <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
          <aside className="admin-card overflow-hidden p-4">
            <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/15">
              {member.portraitUrl ? (
                <Image
                  src={member.portraitUrl}
                  alt={member.portraitAlt}
                  fill
                  unoptimized
                  sizes="(max-width: 1024px) 100vw, 280px"
                  className="object-cover"
                  priority
                />
              ) : (
                <div className="flex h-full items-center justify-center text-4xl font-bold text-primary/40">
                  {member.fullName.slice(0, 1)}
                </div>
              )}
            </div>
            <div className="mt-4 space-y-2 text-sm">
              {member.email ? (
                <p>
                  <span className="text-muted">ایمیل: </span>
                  <a href={`mailto:${member.email}`} className="text-primary" dir="ltr">
                    {member.email}
                  </a>
                </p>
              ) : null}
              {member.phone ? (
                <p>
                  <span className="text-muted">تلفن: </span>
                  <a href={`tel:${member.phone}`} className="text-primary" dir="ltr">
                    {member.phone}
                  </a>
                </p>
              ) : null}
              {member.instagramUrl ? (
                <p>
                  <a
                    href={member.instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline"
                  >
                    اینستاگرام
                  </a>
                </p>
              ) : null}
              {member.linkedinUrl ? (
                <p>
                  <a
                    href={member.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline"
                  >
                    لینکدین
                  </a>
                </p>
              ) : null}
              {member.websiteUrl ? (
                <p>
                  <a
                    href={member.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline"
                  >
                    وب‌سایت
                  </a>
                </p>
              ) : null}
            </div>
          </aside>

          <article className="admin-card space-y-5 p-6 sm:p-8">
            {member.specialty ? (
              <p className="text-sm font-medium text-secondary">
                تخصص: {member.specialty}
              </p>
            ) : null}
            <div className="prose prose-slate max-w-none text-base leading-8 text-foreground">
              {member.biography ? (
                member.biography.split(/\n+/).map((paragraph, index) => (
                  <p key={`${index}-${paragraph.slice(0, 24)}`}>{paragraph}</p>
                ))
              ) : (
                <p className="text-muted">بیوگرافی هنوز ثبت نشده است.</p>
              )}
            </div>
            <Link href="/team" className="inline-flex text-sm text-primary underline">
              بازگشت به فهرست تیم
            </Link>
          </article>
        </div>
      </Container>
    </SiteShell>
  );
}

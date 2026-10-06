const benefits = [
  {
    title: "آموزش هدفمند",
    description: "سرفصل مرحله‌به‌مرحله با تمرکز بر نتیجه",
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <path d="M4 19h16M6 16l3-9 4 6 3-4 2 7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: "دسترسی شخصی",
    description: "کتابخانه اختصاصی پس از خرید",
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <path d="M12 6v12M8 10h8M6 4h12v16H6z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: "ادامه از آخرین نقطه",
    description: "جلسه را دقیقاً از جایی که متوقف کرده‌اید ادامه دهید",
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <path d="M8 5v14l11-7-8-5z" strokeLinejoin="round" />
        <path d="M5 5h2v14H5z" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: "امن روی همه دستگاه‌ها",
    description: "تجربه یکسان روی موبایل و کامپیوتر",
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <rect x="7" y="2" width="10" height="20" rx="2" />
        <path d="M11 18h2" strokeLinecap="round" />
      </svg>
    ),
  },
] as const;

export function AcademyBenefitGrid() {
  return (
    <div className="academy-benefit-grid">
      {benefits.map((item) => (
        <article key={item.title} className="academy-benefit-card">
          <div className="academy-benefit-icon">{item.icon}</div>
          <h3 className="academy-benefit-title">{item.title}</h3>
          <p className="academy-benefit-desc">{item.description}</p>
        </article>
      ))}
    </div>
  );
}

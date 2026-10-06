export function AcademyHeroVisual() {
  return (
    <div className="academy-hero-visual" aria-hidden="true">
      <div className="academy-hero-card academy-hero-card-main">
        <div className="academy-hero-card-badge">دوره منتخب</div>
        <p className="academy-hero-card-title">مسیر یادگیری ساختاریافته</p>
        <div className="academy-hero-progress">
          <span style={{ width: "62%" }} />
        </div>
        <p className="academy-hero-card-meta">۶ جلسه · ادامه از ۱۲:۴۰</p>
      </div>
      <div className="academy-hero-card academy-hero-card-video">
        <div className="academy-hero-play">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden>
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
        <p className="academy-hero-card-meta">پخش امن · موبایل و دسکتاپ</p>
      </div>
      <div className="academy-hero-orbit" />
    </div>
  );
}

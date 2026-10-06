import Link from "next/link";
import { PUBLIC_SITE_ORIGIN } from "@/lib/registration/flows/public-url";

export function AcademyFooter() {
  return (
    <footer className="academy-footer">
      <div className="academy-container academy-footer-grid">
        <div className="academy-footer-brand">
          <p className="academy-footer-title">آکادمی ستارگان</p>
          <p className="academy-footer-lead">
            یادگیری هدفمند با محتوای اختصاصی، کتابخانه شخصی و تجربه تماشای امن.
          </p>
        </div>
        <div className="academy-footer-col">
          <p className="academy-footer-heading">محتوا</p>
          <Link href="/courses">دوره‌ها</Link>
          <Link href="/videos">ویدئوها</Link>
          <Link href="/account/library">کتابخانه من</Link>
        </div>
        <div className="academy-footer-col">
          <p className="academy-footer-heading">پشتیبانی و قوانین</p>
          <Link href="/support">پشتیبانی</Link>
          <Link href="/terms">قوانین استفاده</Link>
          <Link href="/privacy">حریم خصوصی</Link>
        </div>
        <div className="academy-footer-col">
          <p className="academy-footer-heading">حساب کاربری</p>
          <Link href="/login">ورود</Link>
          <a href={`${PUBLIC_SITE_ORIGIN}/about`}>درباره ستارگان پلاس</a>
        </div>
      </div>
      <div className="academy-footer-bottom">
        <div className="academy-container academy-footer-bottom-inner">
          <span>© {new Date().getFullYear()} آکادمی ستارگان</span>
        </div>
      </div>
    </footer>
  );
}

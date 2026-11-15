import "./safar.css";

export default function SafarLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="safar">
      <div className="safar-band">نمایندگی قلم‌چی نسیم‌شهر · مدرس: مهندس رضا ابراهیمی</div>
      {children}
    </div>
  );
}

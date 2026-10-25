# news-feed: اخبار سایت ستارگان پلاس

این شاخه **فقط محتوای خبر** دارد (کد سایت در شاخهٔ `lean-redesign` است).

- هر خبر: `content/news/<slug>.json` و کاور آن در `content/news/covers/`.
- قالب فایل و قواعد محتوا: [`content/news/README.md`](content/news/README.md).
- انتشار: فایل JSON و کاور را به همین شاخه push کنید. سرور هر ۳ ساعت این شاخه را در
  `/var/lib/setareganplus-news` دریافت و خبرهای **تازه** را وارد می‌کند
  (`deploy/lean/news-sync.sh`، گزارش در `/var/log/setareganplus-news.log`).
- خبری که قبلاً وارد شده دیگر از این شاخه به‌روز نمی‌شود؛ ویرایش و حذف از پنل مدیریت (`/admin/news`).

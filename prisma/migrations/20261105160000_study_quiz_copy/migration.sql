-- Refresh only untouched study-quiz copy; preserve admin-customized settings.
UPDATE "Setting"
SET value = jsonb_set("value", '{intro}', '"با یه تست کوتاه و سرگرم‌کننده الگوی مطالعه‌ات رو بشناس؛ آخرش یه هدیه ویژه داریم واست! 🎁"'::jsonb)
WHERE key = 'studyQuiz'
  AND COALESCE(value->>'intro', '') = 'با یک تست کوتاه و سرگرم‌کننده، الگوی مطالعه‌ات را بشناس. در پایان هدیهٔ ویژه‌ای از ستارگان می‌گیری و مشاوران ما می‌توانند دقیق‌تر کمکت کنند.';

UPDATE "Setting"
SET value = jsonb_set("value", '{rewardText}', '"با این کد هر ۳ هدیه مال توئه؛ هنگام تماس یا ثبت‌نام اعلامش کن تا اعمال شود."'::jsonb)
WHERE key = 'studyQuiz'
  AND COALESCE(value->>'rewardText', '') = 'کد هدیهٔ تو برای مشاورهٔ تحصیلی یا خرید جزوه از فروشگاه ستارگان است. این کد را هنگام تماس یا ثبت‌نام بگو تا اعمال شود.';

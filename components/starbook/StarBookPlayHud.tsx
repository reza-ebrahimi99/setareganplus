"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  favoriteSubjects,
  playLevel,
  playTier,
  playTierLabel,
  STARBOOK_BADGES,
  STARBOOK_MISSION,
  emptyStarBookPlay,
} from "@/lib/commerce/starbook/play";
import { readStarBookPlay, syncStarBookPlayVisit } from "@/lib/commerce/starbook/play-store";
import {
  listenStarBookStore,
  readStarBookRecent,
  readStarBookWishlist,
} from "@/lib/commerce/starbook/store";
import { toPersianDigits } from "@/lib/persian";

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "صبح بخیر، ستاره‌سوار";
  if (hour < 17) return "ظهرِ کشف کتاب";
  return "شب امتحان، بدون هرج‌ومرج";
}

export function StarBookPlayHud() {
  const [play, setPlay] = useState(emptyStarBookPlay);

  useEffect(() => {
    setPlay(syncStarBookPlayVisit());
    return listenStarBookStore(() => setPlay(readStarBookPlay()));
  }, []);

  const level = playLevel(play.xp);
  const tier = playTier(play.stars);

  return (
    <div className="starbook-hud">
      <div className="starbook-panel starbook-glass">
        <p className="starbook-kicker">{greeting()}</p>
        <p className="mt-2 text-lg font-black">
          سطح {toPersianDigits(level.level)} ·{" "}
          <span className="starbook-tier" data-tier={tier}>
            {playTierLabel(tier)}
          </span>
        </p>
        <div className="starbook-xp mt-3" aria-hidden>
          <span style={{ width: `${Math.round(level.ratio * 100)}%` }} />
        </div>
        <p className="mt-2 text-xs text-[var(--sb-muted)]">
          {toPersianDigits(play.xp)} XP · {toPersianDigits(play.stars)} ستاره · استریک{" "}
          {toPersianDigits(play.streak)} روز
        </p>
      </div>
      <div className="starbook-panel starbook-glass">
        <p className="starbook-kicker">{STARBOOK_MISSION.title}</p>
        <p className="mt-2 font-black">{STARBOOK_MISSION.hint}</p>
        <div className="starbook-xp mt-3">
          <span
            style={{
              width: `${Math.round((play.missionProgress / STARBOOK_MISSION.goal) * 100)}%`,
            }}
          />
        </div>
        <p className="mt-2 text-xs text-[var(--sb-muted)]">
          {toPersianDigits(play.missionProgress)} از {toPersianDigits(STARBOOK_MISSION.goal)}
        </p>
      </div>
    </div>
  );
}

export function StarBookStudentHub() {
  const [play, setPlay] = useState(emptyStarBookPlay);
  const [wishes, setWishes] = useState(0);
  const [recent, setRecent] = useState(0);

  useEffect(() => {
    const sync = () => {
      setPlay(readStarBookPlay());
      setWishes(readStarBookWishlist().length);
      setRecent(readStarBookRecent().length);
    };
    syncStarBookPlayVisit();
    sync();
    return listenStarBookStore(sync);
  }, []);

  const level = playLevel(play.xp);
  const tier = playTier(play.stars);
  const subjects = favoriteSubjects(play);
  const badges = play.badges.slice(-4);

  const tiles = [
    { href: "/shop/wishlist", title: "کتابخانه من", body: "علاقه‌مندی و ذخیره‌ها", tone: "new" },
    { href: "/shop/account/orders", title: "سفارش‌ها", body: "کد کوتاه و پیگیری", tone: "exam" },
    { href: "/shop/track", title: "رهگیری زنده", body: "QR تحویل حضوری", tone: "flash" },
    { href: "/shop/account/points", title: "دستاوردها", body: "XP، نشان و استریک", tone: "bundle" },
    { href: "/shop/account/notifications", title: "اعلان‌ها", body: "حراج و موج تازه", tone: "flash" },
    { href: "/shop/browse?sort=featured", title: "پیشنهاد برای تو", body: "ادامه مسیر کشف", tone: "exam" },
  ] as const;

  return (
    <>
      <section className="starbook-section grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article className="starbook-panel starbook-glass">
          <p className="text-sm text-[var(--sb-muted)]">سطح / نشان</p>
          <p className="mt-2 text-3xl font-black">{toPersianDigits(level.level)}</p>
          <span className="starbook-tier mt-2" data-tier={tier}>
            {playTierLabel(tier)}
          </span>
        </article>
        <article className="starbook-panel starbook-glass">
          <p className="text-sm text-[var(--sb-muted)]">ستاره‌ها</p>
          <p className="mt-2 text-3xl font-black">{toPersianDigits(play.stars)}</p>
          <p className="mt-2 text-xs text-[var(--sb-muted)]">{toPersianDigits(play.xp)} XP</p>
        </article>
        <article className="starbook-panel starbook-glass">
          <p className="text-sm text-[var(--sb-muted)]">علاقه‌مندی</p>
          <p className="mt-2 text-3xl font-black">{toPersianDigits(wishes)}</p>
          <p className="mt-2 text-xs text-[var(--sb-muted)]">اخیراً دیده: {toPersianDigits(recent)}</p>
        </article>
        <article className="starbook-panel starbook-glass">
          <p className="text-sm text-[var(--sb-muted)]">استریک</p>
          <p className="mt-2 text-3xl font-black">{toPersianDigits(play.streak)}</p>
          <p className="mt-2 text-xs text-[var(--sb-muted)]">روزهای پیاپی حضور</p>
        </article>
      </section>

      <section className="starbook-section">
        <div className="starbook-section-head">
          <div>
            <h2>هاب دانش‌آموز</h2>
            <p>بدون حس پنل اداری — فقط مسیر تو.</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tiles.map((tile) => (
            <Link key={tile.href} href={tile.href} className="starbook-tile" data-tone={tile.tone}>
              <h3>{tile.title}</h3>
              <p className="mt-2 text-sm text-[var(--sb-muted)]">{tile.body}</p>
            </Link>
          ))}
        </div>
      </section>

      {subjects.length > 0 ? (
        <section className="starbook-section">
          <div className="starbook-section-head">
            <h2>درس‌های محبوب تو</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {subjects.map((item) => (
              <Link
                key={item.name}
                href={`/shop/subject/${encodeURIComponent(item.name)}`}
                className="starbook-chip"
              >
                {item.name} · {toPersianDigits(item.count)}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="starbook-section">
        <div className="starbook-panel starbook-glass">
          <h2 className="text-xl font-black">نشان‌ها و جدول موقت</h2>
          <p className="mt-2 text-sm text-[var(--sb-muted)]">
            نشان‌ها روی همین دستگاه ذخیره می‌شوند. لیدربورد سراسری به‌زودی — فعلاً رقابت با خودت.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {badges.length === 0 ? (
              <span className="starbook-chip">هنوز نشانی نداری — یک کتاب ذخیره کن</span>
            ) : (
              badges.map((id) => (
                <span key={id} className="starbook-chip">
                  ✦ {STARBOOK_BADGES[id]?.title ?? id}
                </span>
              ))
            )}
          </div>
          <div className="starbook-leaderboard mt-5">
            <div data-you="true">
              <span>تو</span>
              <strong>{toPersianDigits(play.xp)} XP</strong>
            </div>
            <div>
              <span>همکلاسی نمونه</span>
              <strong>{toPersianDigits(play.xp + 40)} XP</strong>
            </div>
            <div>
              <span>قهرمان پایه</span>
              <strong>{toPersianDigits(play.xp + 120)} XP</strong>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

"use client";

export type StarBookCartLine = {
  id: string;
  slug: string;
  title: string;
  imageUrl: string | null;
  priceRials: number;
  quantity: number;
};

const CART_KEY = "starbook.cart.v1";
const WISH_KEY = "starbook.wish.v1";
const RECENT_KEY = "starbook.recent.v1";
const SEARCH_KEY = "starbook.searches.v1";
const POINTS_KEY = "starbook.points.v1";

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new Event("starbook-store"));
}

export function readStarBookCart(): StarBookCartLine[] {
  return readJson<StarBookCartLine[]>(CART_KEY, []);
}

export function writeStarBookCart(lines: StarBookCartLine[]) {
  writeJson(CART_KEY, lines);
}

export function addStarBookCartLine(line: Omit<StarBookCartLine, "quantity">) {
  const cart = readStarBookCart();
  const existing = cart.find((item) => item.id === line.id);
  if (existing) {
    existing.quantity += 1;
    writeStarBookCart(cart);
    return;
  }
  writeStarBookCart([...cart, { ...line, quantity: 1 }]);
}

export function setStarBookCartQuantity(id: string, quantity: number) {
  const next = readStarBookCart()
    .map((line) => (line.id === id ? { ...line, quantity } : line))
    .filter((line) => line.quantity > 0);
  writeStarBookCart(next);
}

export function readStarBookWishlist(): string[] {
  return readJson<string[]>(WISH_KEY, []);
}

export function toggleStarBookWishlist(id: string): string[] {
  const current = readStarBookWishlist();
  const next = current.includes(id)
    ? current.filter((item) => item !== id)
    : [id, ...current];
  writeJson(WISH_KEY, next);
  return next;
}

export function readStarBookRecent(): string[] {
  return readJson<string[]>(RECENT_KEY, []);
}

export function pushStarBookRecent(id: string) {
  const next = [id, ...readStarBookRecent().filter((item) => item !== id)].slice(0, 12);
  writeJson(RECENT_KEY, next);
}

export function readStarBookSearches(): string[] {
  return readJson<string[]>(SEARCH_KEY, []);
}

export function pushStarBookSearch(query: string) {
  const cleaned = query.trim();
  if (!cleaned) return;
  const next = [cleaned, ...readStarBookSearches().filter((item) => item !== cleaned)].slice(
    0,
    8,
  );
  writeJson(SEARCH_KEY, next);
}

export function readStarBookPoints(): number {
  return readJson<number>(POINTS_KEY, 120);
}

const ADDRESS_KEY = "starbook.address.v1";
const NOTIF_KEY = "starbook.notifs.v1";
const TRACK_KEY = "starbook.tracks.v1";
const RATING_KEY = "starbook.ratings.v1";

export type StarBookAddress = {
  label: string;
  note: string;
};

export type StarBookNotification = {
  id: string;
  title: string;
  body: string;
  read: boolean;
};

export type StarBookRating = {
  score: number;
  text: string;
};

export function readStarBookAddress(): StarBookAddress {
  return readJson<StarBookAddress>(ADDRESS_KEY, {
    label: "شعبه انتخابی هنگام خرید",
    note: "تحویل فقط حضوری در شعبه ستارگان",
  });
}

export function writeStarBookAddress(address: StarBookAddress) {
  writeJson(ADDRESS_KEY, address);
}

export function readStarBookNotifications(): StarBookNotification[] {
  return readJson<StarBookNotification[]>(NOTIF_KEY, [
    {
      id: "welcome",
      title: "خوش آمدی به استاربوک",
      body: "قفسه‌ها زنده‌اند. یک کتاب را ذخیره کن تا پیشنهادها دقیق‌تر شوند.",
      read: false,
    },
    {
      id: "flash",
      title: "حراج شب کنکور",
      body: "تا موجودی شعبه؛ از کمپین فلش سر بزن.",
      read: false,
    },
  ]);
}

export function markStarBookNotificationRead(id: string) {
  const next = readStarBookNotifications().map((item) =>
    item.id === id ? { ...item, read: true } : item,
  );
  writeJson(NOTIF_KEY, next);
  return next;
}

export function readStarBookTracks(): string[] {
  return readJson<string[]>(TRACK_KEY, []);
}

export function pushStarBookTrack(code: string) {
  const cleaned = code.trim().toUpperCase();
  if (!cleaned) return;
  const next = [cleaned, ...readStarBookTracks().filter((item) => item !== cleaned)].slice(
    0,
    8,
  );
  writeJson(TRACK_KEY, next);
}

export function readStarBookRating(skuId: string): StarBookRating | null {
  const all = readJson<Record<string, StarBookRating>>(RATING_KEY, {});
  return all[skuId] ?? null;
}

export function writeStarBookRating(skuId: string, rating: StarBookRating) {
  const all = readJson<Record<string, StarBookRating>>(RATING_KEY, {});
  all[skuId] = rating;
  writeJson(RATING_KEY, all);
}

export function listenStarBookStore(onChange: () => void) {
  window.addEventListener("starbook-store", onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener("starbook-store", onChange);
    window.removeEventListener("storage", onChange);
  };
}

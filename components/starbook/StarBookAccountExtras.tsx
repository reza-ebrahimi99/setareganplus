"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  markStarBookNotificationRead,
  readStarBookAddress,
  readStarBookNotifications,
  readStarBookTracks,
  writeStarBookAddress,
  type StarBookAddress,
  type StarBookNotification,
} from "@/lib/commerce/starbook/store";

export function StarBookAddressBook() {
  const [address, setAddress] = useState<StarBookAddress>({ label: "", note: "" });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setAddress(readStarBookAddress());
  }, []);

  return (
    <form
      className="starbook-panel space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        writeStarBookAddress(address);
        setSaved(true);
      }}
    >
      <h2 className="text-xl font-black">آدرس تحویل</h2>
      <p className="text-sm text-[var(--sb-muted)]">
        استاربوک پست نمی‌کند. اینجا فقط یادداشت شعبه محبوب توست.
      </p>
      <input
        value={address.label}
        onChange={(event) => {
          setAddress({ ...address, label: event.target.value });
          setSaved(false);
        }}
        className="starbook-input"
        placeholder="مثلاً شعبه دخترانه"
      />
      <textarea
        value={address.note}
        onChange={(event) => {
          setAddress({ ...address, note: event.target.value });
          setSaved(false);
        }}
        rows={3}
        className="starbook-input !h-auto py-3"
        placeholder="نکته تحویل؛ مثلاً بعد از ساعت ۱۶"
      />
      <button type="submit" className="starbook-btn starbook-btn-primary">
        {saved ? "ذخیره شد" : "ذخیره یادداشت"}
      </button>
    </form>
  );
}

export function StarBookNotificationList() {
  const [items, setItems] = useState<StarBookNotification[]>([]);
  useEffect(() => {
    setItems(readStarBookNotifications());
  }, []);

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <article key={item.id} className="starbook-panel">
          <p className="starbook-kicker">{item.read ? "خوانده" : "تازه"}</p>
          <h3 className="mt-2 font-black">{item.title}</h3>
          <p className="mt-2 text-sm leading-7 text-[var(--sb-muted)]">{item.body}</p>
          {!item.read ? (
            <button
              type="button"
              className="starbook-btn starbook-btn-ghost mt-3"
              onClick={() => setItems(markStarBookNotificationRead(item.id))}
            >
              متوجه شدم
            </button>
          ) : null}
        </article>
      ))}
    </div>
  );
}

export function StarBookSavedOrders() {
  const [codes, setCodes] = useState<string[]>([]);
  useEffect(() => {
    setCodes(readStarBookTracks());
  }, []);

  if (codes.length === 0) {
    return (
      <p className="text-sm leading-7 text-[var(--sb-muted)]">
        هنوز کد پیگیری ذخیره نکرده‌ای. بعد از پرداخت، کد پیامک را در{" "}
        <Link href="/shop/track" className="underline">
          پیگیری سفارش
        </Link>{" "}
        وارد کن.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {codes.map((code) => (
        <li key={code}>
          <Link href={`/booklet/${encodeURIComponent(code)}`} className="starbook-chip" dir="ltr">
            {code}
          </Link>
        </li>
      ))}
    </ul>
  );
}

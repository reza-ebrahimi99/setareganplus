"use client";

import { useEffect, useState } from "react";
import { toPersianDigits } from "@/lib/persian";

function nextFriday() {
  const now = new Date();
  const day = now.getDay();
  const add = day <= 5 ? 5 - day : 6;
  const end = new Date(now);
  end.setDate(now.getDate() + add);
  end.setHours(23, 59, 0, 0);
  return end;
}

export function StarBookCountdown() {
  const [label, setLabel] = useState("در حال تیک‌تاک…");

  useEffect(() => {
    const tick = () => {
      const delta = nextFriday().getTime() - Date.now();
      if (delta <= 0) {
        setLabel("حراج تمدید شد");
        return;
      }
      const hours = Math.floor(delta / 3_600_000);
      const minutes = Math.floor((delta % 3_600_000) / 60_000);
      setLabel(`${toPersianDigits(hours)} ساعت و ${toPersianDigits(minutes)} دقیقه`);
    };
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, []);

  return <p className="starbook-kicker">پایان موج: {label}</p>;
}

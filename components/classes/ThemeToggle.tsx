"use client";

import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark" | "">("");
  useEffect(() => {
    const saved = localStorage.getItem("sp-classes-theme");
    if (saved === "light" || saved === "dark") {
      setTheme(saved);
      document.querySelector(".cl")?.setAttribute("data-theme", saved);
    }
  }, []);
  const next = theme === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      className="cl-chip"
      onClick={() => {
        setTheme(next);
        localStorage.setItem("sp-classes-theme", next);
        document.querySelector(".cl")?.setAttribute("data-theme", next);
      }}
      aria-label={next === "dark" ? "حالت تیره" : "حالت روشن"}
    >
      {theme === "dark" ? "حالت روشن" : "حالت تیره"}
    </button>
  );
}

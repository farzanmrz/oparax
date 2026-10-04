"use client";

import { Moon, Sun } from "lucide-react";

export const THEME_KEY = "oparax-s2-theme";
export const themeScript = `(function(){try{var q=new URLSearchParams(location.search).get('theme');var t=(q==='light'||q==='dark')?q:localStorage.getItem('${THEME_KEY}');if(t!=='light'&&t!=='dark')t='dark';document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`;

export function ThemeToggle() {
  return (
    <button
      type="button"
      className="s2-icon-btn"
      aria-label="Switch light or dark mode"
      onClick={() => {
        const el = document.documentElement;
        const next = el.getAttribute("data-theme") === "light" ? "dark" : "light";
        el.setAttribute("data-theme", next);
        try {
          localStorage.setItem(THEME_KEY, next);
        } catch {}
      }}
    >
      <Sun size={15} className="s2-sun" />
      <Moon size={15} className="s2-moon" />
    </button>
  );
}

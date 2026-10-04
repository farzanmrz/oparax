// Review tooling for the palette comparison (site/next/THEMES.md). Shared by the root layout (pre-paint
// script) and the review dock (picker), so it carries no "use client" and no React.

export const PALETTES = ["graphite", "slate", "ink", "navy"] as const;
export type Palette = (typeof PALETTES)[number];
export const PALETTE_KEY = "oparax-next-palette";

// ?palette= wins and is remembered (so in-page links keep it); ?palette=current clears it; else the stored one.
export const paletteScript = `(function(){try{var P=${JSON.stringify(PALETTES)};var K='${PALETTE_KEY}';var q=new URLSearchParams(location.search).get('palette');var p;if(q==='current'){localStorage.removeItem(K);p=null;}else if(P.indexOf(q)>=0){p=q;localStorage.setItem(K,q);}else{p=localStorage.getItem(K);}var c=document.documentElement.classList;P.forEach(function(x){c.remove('palette-'+x);});if(P.indexOf(p)>=0)c.add('palette-'+p);}catch(e){}})();`;

export function setPalette(palette: Palette | null) {
  const list = document.documentElement.classList;
  for (const p of PALETTES) list.remove(`palette-${p}`);
  if (palette) list.add(`palette-${palette}`);
  try {
    if (palette) localStorage.setItem(PALETTE_KEY, palette);
    else localStorage.removeItem(PALETTE_KEY);
  } catch {}
}

export function currentPalette(): Palette | null {
  return PALETTES.find((p) => document.documentElement.classList.contains(`palette-${p}`)) ?? null;
}

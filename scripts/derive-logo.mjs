#!/usr/bin/env node
// Re-derives the in-app logo assets from a raw logo export at the repo root.
//
//   node scripts/derive-logo.mjs [source.svg]      (default: DEFAULT_SOURCE below)
//   pnpm derive:logo [source.svg]
//
// Regenerates:
//   components/logo.tsx  — inline mark component (currentColor)
//   app/icon.svg         — SVG favicon (prefers-color-scheme adaptive)
//   app/favicon.ico      — theme-blind fallback (Safari/legacy): white mark on a
//                          dark rounded badge; the 16px entry uses a simplified
//                          ring+dot cut because fine detail is sub-pixel there.
//
// The ICO is rasterized with the sharp package Next.js already ships in
// node_modules — no extra dependency. If sharp cannot be located, the SVG
// outputs are still written and the raster spec is printed so the ICO can be
// produced manually.
//
// Expected export shape: a white full-canvas background rectangle as the
// first path, then the mark's shapes — dark fills are solid, white fills are
// holes fully nested inside a dark shape. Subpath order: outer disc, ring
// hole, center dot, then any fine detail (arcs). The background is dropped
// and the rest is merged into one fill-rule="evenodd" path, which turns the
// nested white shapes into true transparent knockouts. All paths must share
// one uniform (scale + translate) transform or none; such a transform cannot
// change the shape's proportions, so we discard it and compute the viewBox
// in raw path coordinates. Only absolute M/L/C/Z path commands are supported.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

// ── flip logo candidates here (or pass a filename as the CLI argument) ──────
const DEFAULT_SOURCE = "logo-base2.svg";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const sourceName = process.argv[2] ?? DEFAULT_SOURCE;
const svg = fs.readFileSync(path.join(root, sourceName), "utf8");

// ---- extract <path> elements -----------------------------------------------
const paths = [...svg.matchAll(/<path\b[^>]*>/g)].map(([tag]) => ({
  fill: (tag.match(/fill="([^"]*)"/) ?? [, "black"])[1],
  transform: (tag.match(/transform="([^"]*)"/) ?? [, ""])[1],
  d: (tag.match(/\bd="([^"]*)"/) ?? [])[1],
}));
if (paths.length < 4 || paths.some((p) => !p.d)) {
  throw new Error(`expected ≥4 <path d=...> elements in ${sourceName}`);
}

const t0 = paths[0].transform;
if (paths.some((p) => p.transform !== t0)) {
  throw new Error("paths have differing transforms; bake them before deriving");
}
const UNIFORM_TRANSFORM =
  /^(?:matrix\((-?[\d.eE+]+) 0 0 \1 -?[\d.eE+]+ -?[\d.eE+]+\)|scale\((-?[\d.eE+]+)(?:[ ,]+\2)?\))$/;
if (t0 && !UNIFORM_TRANSFORM.test(t0)) {
  throw new Error(`transform is not a uniform scale+translate: ${t0}`);
}

const [bg, ...shapes] = paths;
if (bg.fill !== "white" || !/^M[\d.,\s]+(?:L[\d.,\s]+)+Z?$/.test(bg.d)) {
  throw new Error("first path is not the expected white background rectangle");
}
if (shapes[1].fill !== "white") {
  throw new Error("second mark shape is not the expected white ring hole");
}
const markD = shapes.map((s) => s.d).join(" ");

// ---- exact bounds via Bézier math ------------------------------------------
function pathBounds(d) {
  const tokens = d.match(/[A-Za-z]|-?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/g);
  let i = 0;
  const num = () => parseFloat(tokens[i++]);
  let cmd = "";
  let x = 0, y = 0, startX = 0, startY = 0;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const extend = (px, py) => {
    if (px < minX) minX = px;
    if (px > maxX) maxX = px;
    if (py < minY) minY = py;
    if (py > maxY) maxY = py;
  };
  // 1D cubic Bézier extrema: roots of the quadratic derivative inside (0,1).
  const cubicExtrema = (p0, p1, p2, p3) => {
    const a = -p0 + 3 * p1 - 3 * p2 + p3;
    const b = 2 * (p0 - 2 * p1 + p2);
    const c = p1 - p0;
    const ts = [];
    if (Math.abs(a) < 1e-12) {
      if (Math.abs(b) > 1e-12) ts.push(-c / b);
    } else {
      const disc = b * b - 4 * a * c;
      if (disc >= 0) {
        const s = Math.sqrt(disc);
        ts.push((-b + s) / (2 * a), (-b - s) / (2 * a));
      }
    }
    return ts
      .filter((t) => t > 0 && t < 1)
      .map((t) => {
        const u = 1 - t;
        return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
      });
  };
  while (i < tokens.length) {
    if (/[A-Za-z]/.test(tokens[i])) cmd = tokens[i++];
    switch (cmd) {
      case "M":
        x = num(); y = num();
        startX = x; startY = y;
        extend(x, y);
        cmd = "L"; // subsequent implicit pairs are line-tos
        break;
      case "L":
        x = num(); y = num();
        extend(x, y);
        break;
      case "C": {
        const x1 = num(), y1 = num(), x2 = num(), y2 = num(), x3 = num(), y3 = num();
        extend(x3, y3);
        for (const v of cubicExtrema(x, x1, x2, x3)) extend(v, y);
        for (const v of cubicExtrema(y, y1, y2, y3)) extend(x, v);
        x = x3; y = y3;
        break;
      }
      case "Z":
      case "z":
        x = startX; y = startY;
        break;
      default:
        throw new Error(`unsupported path command "${cmd}" — extend derive-logo.mjs`);
    }
  }
  return { minX, minY, maxX, maxY };
}

const b = pathBounds(markD);
const w = b.maxX - b.minX;
const h = b.maxY - b.minY;
const side = Math.ceil(Math.max(w, h) + 2);
const vbX = (b.minX + w / 2 - side / 2).toFixed(1);
const vbY = (b.minY + h / 2 - side / 2).toFixed(1);
const viewBox = `${vbX} ${vbY} ${side} ${side}`;

// ---- emit derived files ------------------------------------------------------
const generatedNote = `Generated by scripts/derive-logo.mjs from ${sourceName} — edit the script/source, not this file.`;

fs.writeFileSync(
  path.join(root, "components/logo.tsx"),
  `// Oparax logo mark. ${generatedNote}
// The export's white background square is dropped and its white inner shapes
// (which only *painted* holes such as the ring gap) are folded into a single
// fill-rule="evenodd" path, so the holes are truly transparent. The mark fills
// with currentColor and therefore adapts to the surrounding text color —
// light on our dark UI, dark on a light surface.
export function OparaxMark({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="${viewBox}"
      fill="currentColor"
      fillRule="evenodd"
      aria-hidden="true"
      className={className}
    >
      <path d="${markD}" />
    </svg>
  )
}
`
);

fs.writeFileSync(
  path.join(root, "app/icon.svg"),
  `<!-- ${generatedNote} -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}"><style>path{fill:#0d0d0d}@media (prefers-color-scheme:dark){path{fill:#fafafa}}</style><path fill-rule="evenodd" d="${markD}"/></svg>
`
);

console.log(`source: ${sourceName}`);
console.log(`shapes merged: ${shapes.length} (background dropped)`);
console.log(`mark bounds: x ${b.minX.toFixed(2)}..${b.maxX.toFixed(2)} (w ${w.toFixed(2)}), y ${b.minY.toFixed(2)}..${b.maxY.toFixed(2)} (h ${h.toFixed(2)})`);
console.log(`viewBox: ${viewBox}`);
console.log(`wrote components/logo.tsx, app/icon.svg`);

// ---- favicon.ico --------------------------------------------------------------
// Badge: #fafafa mark on #111111 rounded square, corner radius 22% of side,
// 13% padding per side. Entries: 16px simplified ring+dot, 32/48px full mark.
// The simplified cut keeps the mark's real silhouette (center, outer radius,
// dot measured from the source subpaths) but enforces minimum-legibility
// floors — ring thickness ≥14.9% and dot radius ≥19% of the viewBox side
// (≈2.4px / 3px at 16px) — and drops detail that is sub-pixel at 16px.
const FG = "#fafafa";
const BG = "#111111";

const ringB = pathBounds(shapes[0].d);
const holeB = pathBounds(shapes[1].d);
const dotB = pathBounds(shapes[2].d);
const avgR = (bb) => (bb.maxX - bb.minX + bb.maxY - bb.minY) / 4;
const cx = ((ringB.minX + ringB.maxX) / 2).toFixed(1);
const cy = ((ringB.minY + ringB.maxY) / 2).toFixed(1);
const outerR = avgR(ringB);
const ringW = Math.max(outerR - avgR(holeB), 0.149 * side);
const dotR = Math.max(avgR(dotB), 0.19 * side);

const simplifiedContent =
  `<circle cx="${cx}" cy="${cy}" r="${(outerR - ringW / 2).toFixed(1)}" fill="none" stroke="${FG}" stroke-width="${ringW.toFixed(1)}"/>` +
  `<circle cx="${cx}" cy="${cy}" r="${dotR.toFixed(1)}" fill="${FG}"/>`;
const fullContent = `<path fill="${FG}" fill-rule="evenodd" d="${markD}"/>`;

function badgeSvg(content) {
  const pad = 0.13 * side;
  const inner = side + 2 * pad;
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${inner} ${inner}">` +
      `<rect width="${inner}" height="${inner}" rx="${inner * 0.22}" fill="${BG}"/>` +
      `<g transform="translate(${pad - vbX} ${pad - vbY})">${content}</g></svg>`
  );
}

// Minimal ICO container with PNG-encoded entries (fine for all modern browsers).
function buildIco(entries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(entries.length, 4);
  const dir = Buffer.alloc(16 * entries.length);
  let offset = 6 + dir.length;
  entries.forEach(({ size, buf }, i) => {
    const o = i * 16;
    dir.writeUInt8(size, o);
    dir.writeUInt8(size, o + 1);
    dir.writeUInt16LE(1, o + 4);
    dir.writeUInt16LE(32, o + 6);
    dir.writeUInt32LE(buf.length, o + 8);
    dir.writeUInt32LE(offset, o + 12);
    offset += buf.length;
  });
  return Buffer.concat([header, dir, ...entries.map((e) => e.buf)]);
}

function loadSharp() {
  const req = createRequire(path.join(root, "package.json"));
  try {
    return req("sharp");
  } catch {
    // Not a direct dependency — locate it inside the pnpm store (Next ships it).
    const pnpmDir = path.join(root, "node_modules", ".pnpm");
    const hit = fs.existsSync(pnpmDir)
      ? fs.readdirSync(pnpmDir).find((n) => n.startsWith("sharp@"))
      : undefined;
    if (!hit) return null;
    try {
      return req(path.join(pnpmDir, hit, "node_modules", "sharp"));
    } catch {
      return null;
    }
  }
}

const sharp = loadSharp();
if (sharp) {
  const render = (svgBuf, size) => sharp(svgBuf).resize(size, size).png().toBuffer();
  const entries = [
    { size: 16, buf: await render(badgeSvg(simplifiedContent), 16) },
    { size: 32, buf: await render(badgeSvg(fullContent), 32) },
    { size: 48, buf: await render(badgeSvg(fullContent), 48) },
  ];
  fs.writeFileSync(path.join(root, "app", "favicon.ico"), buildIco(entries));
  console.log("wrote app/favicon.ico (16px simplified ring+dot, 32/48px full mark)");
} else {
  console.log(`\nWARNING — sharp not found, app/favicon.ico is now STALE. Raster spec:`);
  console.log(`  3 entries (16/32/48 px, 32-bit RGBA): ${FG} mark on ${BG} rounded square,`);
  console.log(`  corner radius 22% of side, mark width 74% of side (13% padding per side);`);
  console.log(`  16px entry simplified to ring+dot: ${simplifiedContent}`);
}

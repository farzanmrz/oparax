"use client";

import { motion } from "motion/react";
import {
  Zap,
  Boxes,
  Gauge,
  Layers,
  Hexagon,
  Cloud,
  Cpu,
  Database,
  Palette,
  Aperture,
  Compass,
  Orbit,
  Shapes,
  Triangle,
  Diamond,
  Rocket,
  type LucideIcon,
} from "lucide-react";

type Cell = { r: number; c: number; Icon: LucideIcon };

const logoCells: Cell[] = [
  { r: 0, c: 1, Icon: Zap },
  { r: 0, c: 5, Icon: Boxes },
  { r: 0, c: 8, Icon: Gauge },
  { r: 1, c: 0, Icon: Layers },
  { r: 1, c: 6, Icon: Hexagon },
  { r: 1, c: 9, Icon: Cloud },
  { r: 2, c: 1, Icon: Cpu },
  { r: 2, c: 9, Icon: Database },
  { r: 3, c: 0, Icon: Palette },
  { r: 3, c: 10, Icon: Aperture },
  { r: 4, c: 2, Icon: Compass },
  { r: 4, c: 5, Icon: Orbit },
  { r: 4, c: 8, Icon: Shapes },
  { r: 5, c: 1, Icon: Triangle },
  { r: 5, c: 6, Icon: Diamond },
  { r: 5, c: 9, Icon: Rocket },
];

const COLS = 11;
const ROWS = 6;

const isTextZone = (r: number, c: number) =>
  r >= 2 && r <= 3 && c >= 3 && c <= 7;

const cellHash = (r: number, c: number) => {
  const h = Math.sin(r * 127.1 + c * 311.7) * 43758.5453;
  return h - Math.floor(h);
};

export default function Cta6() {
  return (
    <section className="w-full min-h-[var(--rb-section-min-h,100vh)] flex items-center justify-center py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-white dark:bg-neutral-950 overflow-hidden">
      <div className="relative max-w-[1400px] mx-auto w-full">
        <div
          className="grid gap-1.5 sm:gap-2 md:gap-3 lg:gap-4"
          style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: ROWS * COLS }).map((_, idx) => {
            const r = Math.floor(idx / COLS);
            const c = idx % COLS;
            const logo = logoCells.find((l) => l.r === r && l.c === c);
            const inTextZone = isTextZone(r, c);
            const showEmpty = !inTextZone && cellHash(r, c) > 0.35;

            if (inTextZone) {
              return <div key={idx} className="aspect-square" aria-hidden />;
            }

            if (logo) {
              const Icon = logo.Icon;
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, scale: 0.85 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{
                    duration: 0.4,
                    delay: (r + c) * 0.03,
                    ease: "easeOut",
                  }}
                  className="aspect-square rounded-xl sm:rounded-2xl flex items-center justify-center bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm"
                >
                  <Icon
                    className="w-1/2 h-1/2 text-neutral-700 dark:text-neutral-300"
                    strokeWidth={1.5}
                  />
                </motion.div>
              );
            }

            if (!showEmpty) {
              return <div key={idx} className="aspect-square" aria-hidden />;
            }

            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, scale: 0.85 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{
                  duration: 0.4,
                  delay: (r + c) * 0.03,
                  ease: "easeOut",
                }}
                className="aspect-square rounded-xl sm:rounded-2xl bg-neutral-100 dark:bg-neutral-900/60"
              />
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="absolute inset-0 flex flex-col items-center justify-center text-center px-4"
        >
          <h2 className="text-xl sm:text-3xl md:text-4xl lg:text-5xl font-semibold text-neutral-900 dark:text-white tracking-tight leading-tight max-w-[22ch]">
            Plug into your whole stack
          </h2>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="mt-4 sm:mt-6 px-5 py-2.5 rounded-md bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 text-sm font-medium cursor-pointer"
          >
            Browse integrations
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
}

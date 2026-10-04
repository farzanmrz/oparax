// Adapted from React Bits Pro hero-22 (https://pro.reactbits.dev/docs/blocks/hero/hero-22). Changes: mesh stops recolored from violet/pink (#7c3aed, #ffc9df) to the navy/blue glow family; theme comes from the preview's explicit `dark` prop instead of prefers-color-scheme; shader speed follows useSettledMotion so it freezes within about 5s and never starts under reduced motion; min-h-screen removed so the demo row sits in the same glow; vendor badge, copy, pill buttons and trust line replaced with Oparax copy and shadcn Buttons; text colors moved to semantic tokens; frame from DESIGN.md instead of 1400px.
"use client";

import { MotionConfig, motion, type Variants } from "motion/react";
import { MeshGradient } from "@paper-design/shaders-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { frame } from "../../shared/shell";
import { hero } from "../../content";

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};

const headline: Variants = {
  hidden: { opacity: 0, y: 18, filter: "blur(8px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.75, ease: [0.22, 1, 0.36, 1] } },
};

// Navy/blue stops inside the DESIGN.md family; the brightest stop sits low and off-center so the
// headline reads over the darker field.
const mesh = {
  dark: ["#070c18", "#15318a", "#3767ea", "#0b1736", "#090f1d"],
  light: ["#f6f8fc", "#bacdff", "#87a7ff", "#e2eaff", "#f6f8fc"],
};

export function Hero22({
  dark,
  running,
  reduced,
  onSignup,
  onFeed,
  children,
}: {
  dark: boolean;
  running: boolean;
  reduced: boolean;
  onSignup: () => void;
  onFeed: () => void;
  children?: React.ReactNode;
}) {
  return (
    <section className="relative isolate w-full overflow-hidden pb-10 pt-10 desk:pt-11">
      <MeshGradient
        key={dark ? "dark" : "light"}
        className="absolute inset-0 -z-20 h-full w-full"
        style={{ width: "100%", height: "100%" }}
        colors={dark ? mesh.dark : mesh.light}
        distortion={0.9}
        swirl={0.22}
        grainMixer={0.12}
        grainOverlay={0.04}
        scale={1.1}
        frame={reduced ? 9000 : 0}
        speed={running ? 0.45 : 0}
      />
      {/* Scrims keep the headline and tiles readable and fade the glow into the page background. */}
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-0 -z-10",
          dark
            ? "bg-[radial-gradient(ellipse_46%_30%_at_50%_16%,rgb(9_15_29/0.72),rgb(9_15_29/0)_100%),linear-gradient(to_bottom,rgb(9_15_29/0.15)_40%,var(--background)_96%)]"
            : "bg-[radial-gradient(ellipse_46%_30%_at_50%_16%,rgb(246_248_252/0.9),rgb(246_248_252/0)_100%),linear-gradient(to_bottom,rgb(246_248_252/0)_40%,var(--background)_96%)]",
        )}
      />

      {/* reducedMotion="user" drops the rise under reduced motion while server and client render alike. */}
      <MotionConfig reducedMotion="user">
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className={cn(frame, "flex flex-col items-center text-center")}
      >
        <motion.h1
          variants={headline}
          className="max-w-4xl text-[38px] font-semibold leading-[1.05] tracking-[-0.03em] text-foreground desk:text-[54px]"
        >
          {hero.headline}
        </motion.h1>
        <motion.p variants={item} className="mt-4 max-w-2xl text-base leading-relaxed text-foreground/85 desk:text-lg">
          {hero.subhead}
        </motion.p>
        <motion.div variants={item} className="mt-6 flex w-full flex-col gap-3 desk:w-auto desk:flex-row">
          <Button onClick={onSignup} className="h-11 px-6 text-sm">
            {hero.primary}
          </Button>
          <Button variant="outline" onClick={onFeed} className="h-11 bg-card/60 px-6 text-sm backdrop-blur">
            {hero.secondary}
          </Button>
        </motion.div>
      </motion.div>
      </MotionConfig>

      {children}
    </section>
  );
}

export default Hero22;

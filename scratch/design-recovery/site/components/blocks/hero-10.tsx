"use client";

import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";

const cards = [
  {
    rotate: -12,
    translateY: 40,
    src: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&h=600&fit=crop",
    alt: "Creative technology",
  },
  {
    rotate: 0,
    translateY: 0,
    src: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=600&h=600&fit=crop",
    alt: "Building something new",
  },
  {
    rotate: 12,
    translateY: 40,
    src: "https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=600&h=600&fit=crop",
    alt: "Creative workspace",
  },
];

export function Hero10() {
  return (
    <section className="relative w-full overflow-hidden bg-white dark:bg-neutral-950 py-12 px-4 sm:px-6 lg:px-8">
      <div className="relative z-10 max-w-[1400px] mx-auto w-full">
        <div className="flex flex-col items-start sm:items-center text-left sm:text-center mb-12 sm:mb-20 lg:mb-24">
          <motion.h1
            className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-medium text-neutral-900 dark:text-white tracking-tight max-w-2xl"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            Build something extraordinary today
          </motion.h1>

          <motion.p
            className="mt-4 sm:mt-6 text-base sm:text-xl text-neutral-600 dark:text-neutral-400 max-w-xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            Transform your ideas into reality with powerful tools designed for
            creators, founders, and dreamers.
          </motion.p>

          <motion.button
            className="mt-6 sm:mt-8 px-6 sm:px-8 py-3 sm:py-4 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-full text-sm sm:text-base font-medium hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors flex items-center gap-2 cursor-pointer"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Get started now
            <ArrowRight className="w-4 h-4" />
          </motion.button>
        </div>

        <div className="relative">
          <div className="absolute shadow-2xl shadow-purple-500/50 left-1/2 -translate-x-1/2 top-[80%] sm:top-[40%] w-[250%] sm:w-[200%] aspect-square rounded-full bg-white dark:bg-neutral-950 pointer-events-none z-10" />

          <div className="relative flex flex-row items-end justify-center -space-x-6 sm:-space-x-12 lg:-space-x-16">
            {cards.map((card, index) => (
              <motion.div
                key={index}
                className="relative w-28 sm:w-72 lg:w-80 h-28 sm:h-64 lg:h-72 rounded-xl sm:rounded-3xl overflow-hidden origin-bottom"
                initial={{ opacity: 0, y: 80, rotate: 0 }}
                animate={{
                  opacity: 1,
                  y: card.translateY,
                  rotate: card.rotate,
                }}
                whileHover={{
                  y: card.translateY - 12,
                  transition: { type: "spring", stiffness: 400, damping: 25 },
                }}
                transition={{
                  duration: 0.7,
                  delay: 0.4 + index * 0.12,
                  ease: [0.25, 0.46, 0.45, 0.94],
                }}
              >
                <img
                  src={card.src}
                  alt={card.alt}
                  className="w-full h-full object-cover"
                />
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default Hero10;

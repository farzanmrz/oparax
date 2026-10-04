"use client";

import { motion } from "motion/react";

export default function SocialProof1() {
  const companies = [
    { name: "Acme Corp", logo: "/mock-logos/acmecorp.svg" },
    { name: "Galileo", logo: "/mock-logos/galileo.svg" },
    { name: "Layers", logo: "/mock-logos/layers.svg" },
    { name: "Capsule", logo: "/mock-logos/capsule.svg" },
    { name: "Luminous", logo: "/mock-logos/luminous.svg" },
    { name: "Quotient", logo: "/mock-logos/quotient.svg" },
  ];

  return (
    <section className="w-full bg-white py-16 dark:bg-neutral-950 sm:py-24 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1400px]">
        <h2 className="mb-12 text-center text-lg font-medium text-neutral-900 dark:text-neutral-100 sm:text-xl">
          Trusted by the most innovative companies in the world
        </h2>

        <div className="grid grid-cols-1 border border-neutral-200 dark:border-neutral-800 md:grid-cols-3 lg:grid-cols-6">
          {companies.map((company, index) => (
            <motion.div
              key={company.name}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
              className="flex items-center justify-center border-b border-neutral-200 bg-white px-8 py-8 last:border-b-0 dark:border-neutral-800 dark:bg-neutral-950 md:border-r md:[&:nth-child(3n)]:border-r-0 md:[&:nth-last-child(-n+3)]:border-b-0 lg:[&:nth-child(3n)]:border-r lg:[&:nth-child(6n)]:border-r-0 lg:[&:nth-last-child(-n+6)]:border-b-0"
            >
              <img
                src={company.logo}
                alt={`${company.name} logo`}
                className="h-8 w-auto object-contain brightness-0 opacity-60 transition-opacity duration-200 hover:opacity-100 dark:invert dark:opacity-40 dark:hover:opacity-80"
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

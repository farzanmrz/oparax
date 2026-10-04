"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Adapted from the free React Bits Portfolio Projects and FadeIn sources.
// Exact upstream paths, license statement and changes are in d2-notes.md.
export function PortfolioGallery({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className="d2-portfolio-gallery"
      initial={reduced ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function PortfolioStory({
  title,
  description,
  image,
  facts,
  footer,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  image?: ReactNode;
  facts?: ReactNode;
  footer: ReactNode;
  className?: string;
}) {
  return (
    <article className={cn("d2-portfolio-item", className)}>
      <Card className="d2-portfolio-card">
        {image && <CardContent className="d2-portfolio-media">{image}</CardContent>}
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        {facts && <CardContent className="d2-portfolio-facts">{facts}</CardContent>}
        <CardFooter>{footer}</CardFooter>
      </Card>
    </article>
  );
}

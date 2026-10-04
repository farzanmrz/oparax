"use client";

import { Layers3, Globe2, Rss, Mail, MessageSquare, Search } from "lucide-react";
import { useState } from "react";
import { catalogFavicons, catalogMarks } from "../content/catalog-marks";
import { extraMarks } from "../content/extra-marks";
import { brandMarks } from "../content/marks";
import { roadmapMarks } from "../content/roadmap-marks";
import { officialRoadmapAssets } from "../content/official-roadmap-assets";
export function Mark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 1024 1024" aria-hidden="true" className={`mark ${className}`}>
      <path
        d="M 431.77 811.44 A 310 310 0 0 1 431.77 212.56 M 592.23 212.56 A 310 310 0 0 1 592.23 811.44"
        fill="none"
        stroke="currentColor"
        strokeWidth="73"
        strokeLinecap="round"
      />
      <circle cx="512" cy="512" r="132" fill="currentColor" />
    </svg>
  );
}
export function Brand({ name, className = "" }: { name: string; className?: string }) {
  const artwork = officialRoadmapAssets[name];
  if (artwork) return <span className={`brand official-brand brand-${name} ${className}`} aria-hidden="true"><img className={artwork.darkSrc?'brand-on-light':''} src={artwork.src} alt=""/>{artwork.darkSrc&&<img className="brand-on-dark" src={artwork.darkSrc} alt=""/>}</span>;
  const icons = { web: Globe2, rss: Rss, mail: Mail, message: MessageSquare, search: Search };
  if (name in icons) {
    const Icon = icons[name as keyof typeof icons];
    return <Icon className={`brand ${className}`} aria-hidden="true" />;
  }
  if (name in catalogFavicons)
    return <OfficialFavicon name={name as keyof typeof catalogFavicons} className={className} />;
  const catalogMark = catalogMarks[name];
  if (catalogMark)
    return (
      <svg
        className={`brand brand-${name} ${className}`}
        viewBox={catalogMark.viewBox}
        aria-hidden="true"
      >
        {catalogMark.parts ? (
          catalogMark.parts.map((part) => (
            <path
              key={part.path}
              d={part.path}
              fill={catalogMark.monochrome ? "currentColor" : part.fill}
              transform={part.transform}
            />
          ))
        ) : (
          <path
            d={catalogMark.path}
            fill={catalogMark.monochrome ? "currentColor" : catalogMark.color}
          />
        )}
      </svg>
    );
  const mark =
    name in brandMarks
      ? brandMarks[name as keyof typeof brandMarks]
      : name in extraMarks
        ? extraMarks[name as keyof typeof extraMarks]
        : roadmapMarks[name as keyof typeof roadmapMarks];
  if (!mark) return <Globe2 className={`brand ${className}`} aria-hidden="true" />;
  return (
    <svg className={`brand brand-${name} ${className}`} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d={mark.path}
        fill={["x", "github", "tiktok", "threads"].includes(name) ? "currentColor" : mark.color}
      />
    </svg>
  );
}

function OfficialFavicon({
  name,
  className,
}: {
  name: keyof typeof catalogFavicons;
  className: string;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return <Globe2 className={`brand brand-${name} ${className}`} aria-hidden="true" />;
  return (
    <img
      src={catalogFavicons[name].url}
      alt=""
      aria-hidden="true"
      className={`brand brand-${name} ${className}`}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}

export function SignalIcon({ className = "" }: { className?: string }) {
  return <Layers3 className={`mark signal-icon ${className}`} aria-hidden="true" />;
}

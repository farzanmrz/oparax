"use client";

// React Bits, David Haz. MIT plus Commons Clause. See LICENSE.md and PROVENANCE.md.

import {
  useRef,
  useEffect,
  useState,
  useCallback,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { gsap } from "gsap";
import { useReducedMotion } from "motion/react";

export interface AccordionGalleryItem {
  image?: string;
  content?: ReactNode;
  preview?: ReactNode;
  label?: string;
  link?: string;
  alt?: string;
}

export interface AccordionGalleryProps {
  items?: AccordionGalleryItem[];
  defaultIndex?: number;
  accentColor?: string;
  overlayColor?: string;
  textColor?: string;
  height?: number;
  gap?: number;
  radius?: number;
  expandRatio?: number;
  orientation?: "horizontal" | "vertical";
  duration?: number;
  ease?: string;
  parallax?: number;
  tilt?: number;
  stagger?: number;
  trigger?: "hover" | "click";
  showLabels?: boolean;
  grayscale?: boolean;
  className?: string;
}

const DEFAULT_ITEMS: AccordionGalleryItem[] = [
  { image: "https://picsum.photos/id/1015/900/1200", label: "Canyon", link: "#" },
  { image: "https://picsum.photos/id/1018/900/1200", label: "Ridgeline", link: "#" },
  { image: "https://picsum.photos/id/1039/900/1200", label: "Falls", link: "#" },
  { image: "https://picsum.photos/id/1043/900/1200", label: "Harbour", link: "#" },
  { image: "https://picsum.photos/id/1044/900/1200", label: "Skyline", link: "#" },
];

const AccordionGallery = ({
  items = DEFAULT_ITEMS,
  defaultIndex = 2,
  accentColor = "#ffffff",
  overlayColor = "#060010",
  textColor = "#ffffff",
  height = 460,
  gap = 10,
  radius = 16,
  expandRatio = 0.52,
  orientation = "horizontal",
  duration = 0.6,
  ease = "power3.out",
  parallax = 0.5,
  tilt = 8,
  stagger = 0.06,
  trigger = "hover",
  showLabels = true,
  grayscale = true,
  className = "",
}: AccordionGalleryProps) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRefs = useRef<(HTMLElement | null)[]>([]);
  const mediaRefs = useRef<(HTMLElement | null)[]>([]);
  const barRefs = useRef<(HTMLElement | null)[]>([]);
  const textRefs = useRef<(HTMLElement | null)[]>([]);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const firstRunRef = useRef(true);
  const mediaSizeRef = useRef(320);

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 699px)");
    const update = () => setIsMobile(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  const selectionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const vertical = orientation === "vertical";
  const count = items.length;
  const [active, setActive] = useState(Math.min(Math.max(defaultIndex, 0), count - 1));

  const prefersReduced = useReducedMotion();

  const overlayBg = `linear-gradient(180deg, transparent 45%, color-mix(in srgb, ${overlayColor} 78%, transparent) 100%), color-mix(in srgb, ${overlayColor} calc(var(--ag-dim, 0.35) * 100%), transparent)`;

  const applyLayout = useCallback(
    (animate: boolean) => {
      const panels = panelRefs.current;
      if (!panels.length) return;

      const r = Math.min(Math.max(expandRatio, 0.2), 0.9);
      const grow = count > 1 ? (r * (count - 1)) / (1 - r) : 1;
      const mediaSize = mediaSizeRef.current;

      tlRef.current?.kill();
      const dur = animate && !prefersReduced ? duration : 0;
      const tl = gsap.timeline();

      panels.forEach((panel, i) => {
        if (!panel) return;
        const isActive = i === active;
        const media = mediaRefs.current[i];
        const bar = barRefs.current[i];
        const text = textRefs.current[i];

        const rot = isActive || isMobile || prefersReduced ? 0 : i < active ? tilt : -tilt;
        const rotProp = vertical ? { rotateX: -rot } : { rotateY: rot };

        tl.to(
          panel,
          { flexGrow: isActive && !isMobile ? grow : 1, ...rotProp, duration: dur, ease },
          0,
        );

        if (media) {
          const drift = Math.max(-1.5, Math.min(1.5, active - i));
          const shift = drift * parallax * mediaSize * 0.06;
          const gray = grayscale ? (isActive ? 0 : 1) : 0;
          tl.to(
            media,
            {
              xPercent: -50,
              yPercent: -50,
              x: vertical ? 0 : isActive ? 0 : shift,
              y: vertical ? (isActive ? 0 : shift) : 0,
              "--ag-gray": gray,
              "--ag-dim": isActive ? 0 : 0.35,
              duration: dur,
              ease,
            },
            0,
          );
        }

        if (showLabels && bar && text) {
          if (isActive) {
            tl.to(
              [bar, text],
              { opacity: 1, x: 0, duration: dur, ease, stagger: prefersReduced ? 0 : stagger },
              0,
            );
          } else {
            tl.to([bar, text], { opacity: 0, x: -14, duration: dur * 0.6, ease }, 0);
          }
        }
      });

      tlRef.current = tl;
    },
    [
      active,
      count,
      expandRatio,
      duration,
      ease,
      vertical,
      tilt,
      parallax,
      grayscale,
      showLabels,
      stagger,
      prefersReduced,
      isMobile,
    ],
  );

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    const measure = () => {
      const rect = el.getBoundingClientRect();
      const total = vertical ? rect.height : rect.width;
      const usable = Math.max(total - gap * (count - 1), 120);
      const size = Math.max(140, usable * Math.min(Math.max(expandRatio, 0.2), 0.9) * 1.22);
      mediaSizeRef.current = size;
      el.style.setProperty("--ag-media-size", `${size}px`);
      applyLayout(!firstRunRef.current);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [applyLayout, gap, count, expandRatio, vertical]);

  useEffect(() => {
    applyLayout(!firstRunRef.current);
    firstRunRef.current = false;
  }, [applyLayout]);

  useEffect(
    () => () => {
      tlRef.current?.kill();
    },
    [],
  );

  const handleEnter = (i: number) => {
    if (trigger === "hover") setActive(i);
  };

  const handleKeyDown = (i: number, e: KeyboardEvent) => {
    let next: number;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (i + 1) % count;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (i - 1 + count) % count;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = count - 1;
    else return;
    e.preventDefault();
    setActive(next);
    selectionRefs.current[next]?.focus();
  };

  return (
    <div
      ref={rootRef}
      data-react-bits="AccordionGallery"
      className={`flex ${vertical || isMobile ? "flex-col" : "flex-row"} w-full max-w-full [perspective:1400px] max-[699px]:!flex-col max-[699px]:[perspective:none] ${className}`}
      style={{
        gap: `${gap}px`,
        height: isMobile ? "auto" : vertical ? `${Math.round(height * 1.6)}px` : `${height}px`,
      }}
      role="list"
      aria-label="Story accordion gallery"
    >
      {items.map((item, i) => {
        const isActive = i === active;
        return (
          <div
            key={i}
            ref={(el: HTMLElement | null) => {
              panelRefs.current[i] = el;
            }}
            className="group relative block min-w-0 min-h-0 flex-[1_1_0] cursor-pointer overflow-hidden bg-[var(--card)] text-[var(--ink)] no-underline outline-none [transform-style:preserve-3d] [transform-origin:center] [box-shadow:0_10px_30px_-18px_rgba(0,0,0,0.8)] focus-visible:[box-shadow:0_0_0_2px_var(--ag-accent),0_10px_30px_-18px_rgba(0,0,0,0.8)] max-[699px]:min-h-[84px] max-[699px]:!transform-none"
            style={
              {
                borderRadius: `${radius}px`,
                "--ag-accent": accentColor,
                willChange: "flex-grow, transform",
              } as CSSProperties
            }
            onMouseEnter={() => handleEnter(i)}
            role="listitem"
            aria-current={isActive ? "true" : undefined}
          >
            <button
              type="button"
              ref={(el) => {
                selectionRefs.current[i] = el;
              }}
              className={`relative z-[3] block w-full border-0 bg-transparent p-5 text-left font-semibold text-inherit cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--ag-accent)] focus-visible:outline-offset-[-3px] ${item.content ? "" : "min-h-[84px]"}`}
              onClick={() => setActive(i)}
              onFocus={() => setActive(i)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              aria-expanded={isActive || isMobile}
            >
              {item.label || item.alt || `Story ${i + 1}`}
            </button>
            {item.preview && !isActive && !isMobile && (
              <div className="relative z-[2] px-5 pb-5">{item.preview}</div>
            )}
            {item.content && (
              <div className="relative z-[2] px-5 pb-5" hidden={!isActive && !isMobile}>
                {item.content}
                {item.link && <a href={item.link}>Read original</a>}
              </div>
            )}
            {item.image && (
              <span className="absolute inset-0 overflow-hidden [border-radius:inherit]">
                <span
                  ref={(el: HTMLElement | null) => {
                    mediaRefs.current[i] = el;
                  }}
                  className="absolute top-1/2 left-1/2 [filter:grayscale(var(--ag-gray,1))]"
                  style={{
                    width: vertical ? "100%" : "var(--ag-media-size, 320px)",
                    height: vertical ? "var(--ag-media-size, 320px)" : "100%",
                    willChange: "transform, filter",
                  }}
                >
                  <img
                    src={item.image}
                    alt={item.alt || item.label || ""}
                    draggable={false}
                    className="block h-full w-full select-none object-cover [-webkit-user-drag:none]"
                  />
                </span>
                <span
                  className="pointer-events-none absolute inset-0"
                  style={{ background: overlayBg }}
                  aria-hidden="true"
                />
              </span>
            )}
            {showLabels && !item.content && (
              <span
                className="pointer-events-none absolute bottom-5 left-5 right-5 z-[2] flex items-center gap-3"
                aria-hidden="true"
              >
                <span
                  ref={(el: HTMLElement | null) => {
                    barRefs.current[i] = el;
                  }}
                  className="h-[26px] w-[3px] flex-none rounded-[3px] opacity-0"
                  style={{
                    background: accentColor,
                    boxShadow: `0 0 12px color-mix(in srgb, ${accentColor} 60%, transparent)`,
                  }}
                />
                <span
                  ref={(el: HTMLElement | null) => {
                    textRefs.current[i] = el;
                  }}
                  className="overflow-hidden text-ellipsis whitespace-nowrap text-[clamp(1rem,1.4vw,1.4rem)] font-semibold tracking-[0.01em] opacity-0 [text-shadow:0_2px_14px_rgba(0,0,0,0.55)]"
                  style={{ color: textColor }}
                >
                  {item.label}
                </span>
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default AccordionGallery;

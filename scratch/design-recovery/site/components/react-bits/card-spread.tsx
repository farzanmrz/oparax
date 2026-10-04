"use client";

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { motion, useReducedMotion } from "motion/react";

import { cn } from "@/lib/utils";

export interface CardSpreadCard {
  id?: string;
  src: string;
  alt?: string;
}

export interface CardSpreadProps {
  /** Images laid out along the arc, left to right. */
  cards?: CardSpreadCard[];
  /** Width of a single card in pixels. */
  cardWidth?: number;
  /** Height of a single card in pixels. */
  cardHeight?: number;
  /** Corner radius of a card in pixels. */
  cardRadius?: number;
  /** Radius of the invisible circle the cards hang from, in pixels. */
  radius?: number;
  /** Total angle the fan covers, in degrees. */
  arc?: number;
  /** Frame colour behind each image. */
  cardColor?: string;
  /** Padding between the frame edge and the image, in pixels. */
  cardPadding?: number;
  /** Hairline border colour drawn around each card. */
  borderColor?: string;
  /** Drop shadow strength, 0 disables it. */
  shadow?: number;
  /** How far a hovered card slides outward along its own axis, in pixels. */
  lift?: number;
  /** Degrees the nearest neighbour is pushed aside on hover. */
  push?: number;
  /** How many neighbours on each side react to a hover. */
  pushReach?: number;
  /** Opacity applied to cards that are not hovered, 1 leaves them alone. */
  restOpacity?: number;
  /** Spring stiffness of the fan and hover motion. */
  stiffness?: number;
  /** Spring damping of the fan and hover motion. */
  damping?: number;
  /** Spring mass of the fan and hover motion. */
  mass?: number;
  /** Seconds between each card fading in on mount. */
  stagger?: number;
  /** Scale the whole fan down so it always fits the container. */
  fit?: boolean;
  /** Upper bound applied to the fit scale. */
  maxScale?: number;
  /** Enable pointer and keyboard interaction. */
  interactive?: boolean;
  /** Optional className applied to the root. */
  className?: string;
  /** Optional inline style applied to the root. */
  style?: CSSProperties;
}

const DEG = Math.PI / 180;
const ENTRY_CURVE = [0.16, 1, 0.3, 1] as const;

const DEFAULT_CARDS: CardSpreadCard[] = [
  {
    id: "atrium",
    src: "https://images.unsplash.com/photo-1449157291145-7efd050a4d0e?q=80&w=800&auto=format&fit=crop",
    alt: "Glass atrium seen from below",
  },
  {
    id: "spiral",
    src: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=800&auto=format&fit=crop",
    alt: "Corporate tower against an open sky",
  },
  {
    id: "vault",
    src: "https://images.unsplash.com/photo-1487958449943-2429e8be8625?q=80&w=800&auto=format&fit=crop",
    alt: "White concrete facade in daylight",
  },
  {
    id: "lattice",
    src: "https://images.unsplash.com/photo-1479839672679-a46483c0e7c8?q=80&w=800&auto=format&fit=crop",
    alt: "Repeating window lattice on a high rise",
  },
  {
    id: "terrace",
    src: "https://images.unsplash.com/photo-1518005020951-eccb494ad742?q=80&w=800&auto=format&fit=crop",
    alt: "Terraced building stepping into the sky",
  },
  {
    id: "arches",
    src: "https://images.unsplash.com/photo-1523217582562-09d0def993a6?q=80&w=800&auto=format&fit=crop",
    alt: "Row of arches along a shaded walkway",
  },
  {
    id: "canopy",
    src: "https://images.unsplash.com/photo-1470075801209-17f9ec0cada6?q=80&w=800&auto=format&fit=crop",
    alt: "Steel canopy over a public square",
  },
];

const clamp = (value: number, low: number, high: number) =>
  Math.min(Math.max(value, low), high);

interface Frame {
  width: number;
  height: number;
  pivotX: number;
  pivotY: number;
}

const measure = (
  span: number,
  radius: number,
  cardWidth: number,
  cardHeight: number,
  lift: number,
): Frame => {
  const half = cardWidth / 2;
  const reach = [-lift, cardHeight];
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (let step = 0; step <= 48; step += 1) {
    const angle = (-span / 2 + (span * step) / 48) * DEG;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    for (const edge of [-half, half]) {
      for (const depth of reach) {
        const local = depth - radius;
        const x = edge * cos - local * sin;
        const y = edge * sin + local * cos;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  return {
    width: Math.max(maxX - minX, 1),
    height: Math.max(maxY - minY, 1),
    pivotX: -minX,
    pivotY: -minY,
  };
};

interface CardProps {
  index: number;
  src: string;
  alt: string;
  angle: number;
  raised: boolean;
  faded: number;
  layer: number;
  left: number;
  top: number;
  orbit: number;
  width: number;
  height: number;
  radius: number;
  padding: number;
  paper: string;
  border: string;
  shadow: number;
  lift: number;
  stagger: number;
  stiffness: number;
  damping: number;
  mass: number;
  still: boolean;
  interactive: boolean;
  onEnter: (index: number) => void;
  onLeave: () => void;
}

const Card = memo(function Card({
  index,
  src,
  alt,
  angle,
  raised,
  faded,
  layer,
  left,
  top,
  orbit,
  width,
  height,
  radius,
  padding,
  paper,
  border,
  shadow,
  lift,
  stagger,
  stiffness,
  damping,
  mass,
  still,
  interactive,
  onEnter,
  onLeave,
}: CardProps) {
  const spring = still
    ? ({ duration: 0 } as const)
    : ({ type: "spring", stiffness, damping, mass } as const);

  return (
    <motion.div
      className="absolute"
      style={{
        left,
        top: top - orbit,
        width,
        height,
        marginLeft: -width / 2,
        transformOrigin: `50% ${orbit}px`,
        zIndex: layer,
      }}
      initial={still ? false : { rotate: 0 }}
      animate={{ rotate: angle }}
      transition={spring}
    >
      <motion.div
        className="h-full w-full"
        animate={{ y: raised ? -lift : 0 }}
        transition={spring}
      >
        <motion.div
          className="h-full w-full"
          initial={still ? false : { opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            duration: still ? 0 : 0.5,
            delay: still ? 0 : stagger * index,
            ease: ENTRY_CURVE as unknown as [number, number, number, number],
          }}
        >
          <motion.div
            className="h-full w-full"
            animate={{ opacity: faded }}
            transition={{ duration: still ? 0 : 0.22 }}
            onPointerEnter={() => onEnter(index)}
            onFocus={() => onEnter(index)}
            onBlur={onLeave}
            tabIndex={interactive ? 0 : -1}
          >
            <div
              className="h-full w-full overflow-hidden"
              style={{
                borderRadius: radius,
                background: paper,
                padding,
                border: `1px solid ${border}`,
                boxShadow:
                  shadow > 0
                    ? `0 ${Math.round(18 * shadow)}px ${Math.round(
                        42 * shadow,
                      )}px rgba(0,0,0,${clamp(shadow * 0.9, 0, 1)})`
                    : "none",
              }}
            >
              <img
                src={src}
                alt={alt}
                draggable={false}
                loading="lazy"
                className="block h-full w-full object-cover"
                style={{ borderRadius: Math.max(radius - padding, 0) }}
              />
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
});

const CardSpread = ({
  cards = DEFAULT_CARDS,
  cardWidth = 168,
  cardHeight = 252,
  cardRadius = 12,
  radius = 440,
  arc = 88,
  cardColor = "#ffffff",
  cardPadding = 0,
  borderColor = "transparent",
  shadow = 0.28,
  lift = 26,
  push = 3.6,
  pushReach = 3,
  restOpacity = 1,
  stiffness = 150,
  damping = 16,
  mass = 1,
  stagger = 0.06,
  fit = true,
  maxScale = 1,
  interactive = true,
  className,
  style,
}: CardSpreadProps) => {
  const reduceMotion = useReducedMotion();
  const shell = useRef<HTMLDivElement | null>(null);
  const [measured, setMeasured] = useState(1);
  const [active, setActive] = useState<number | null>(null);

  const deck = cards.length > 0 ? cards : DEFAULT_CARDS;
  const count = deck.length;

  const geometry = useMemo(() => {
    const span = clamp(arc, 0, 340);
    return {
      span,
      step: count > 1 ? span / (count - 1) : 0,
      frame: measure(
        span,
        Math.max(radius, cardHeight),
        cardWidth,
        cardHeight,
        Math.max(lift, 0),
      ),
    };
  }, [arc, count, radius, cardWidth, cardHeight, lift]);

  const orbit = Math.max(radius, cardHeight);

  useEffect(() => {
    const node = shell.current;
    if (!node || !fit) return;

    const observer = new ResizeObserver((entries) => {
      const box = entries[0]?.contentRect;
      if (!box || box.width === 0 || box.height === 0) return;
      const next = Math.min(
        maxScale,
        box.width / geometry.frame.width,
        box.height / geometry.frame.height,
      );
      setMeasured(Number.isFinite(next) && next > 0 ? next : maxScale);
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, [fit, maxScale, geometry.frame.width, geometry.frame.height]);

  const scale = fit ? measured : maxScale;

  const enter = useCallback(
    (index: number) => {
      if (interactive) setActive(index);
    },
    [interactive],
  );

  const leave = useCallback(() => {
    if (interactive) setActive(null);
  }, [interactive]);

  const middle = (count - 1) / 2;
  const still = Boolean(reduceMotion);

  return (
    <div
      ref={shell}
      className={cn(
        "relative flex h-full w-full items-center justify-center overflow-hidden",
        className,
      )}
      style={style}
      onPointerLeave={leave}
    >
      <div
        className="relative"
        style={{
          width: geometry.frame.width,
          height: geometry.frame.height,
          transform: `scale(${scale})`,
        }}
      >
        {deck.map((card, index) => {
          let shift = 0;
          if (active !== null && active !== index) {
            const gap = index - active;
            const reach = Math.abs(gap);
            if (reach <= pushReach) {
              shift = Math.sign(gap) * push * (pushReach + 1 - reach);
            }
          }

          const raised = active === index;

          return (
            <Card
              key={card.id ?? `${card.src}-${index}`}
              index={index}
              src={card.src}
              alt={card.alt ?? ""}
              angle={-geometry.span / 2 + geometry.step * index + shift}
              raised={raised}
              faded={active === null || raised ? 1 : clamp(restOpacity, 0, 1)}
              layer={
                raised
                  ? count + 2
                  : Math.round(count - Math.abs(index - middle))
              }
              left={geometry.frame.pivotX}
              top={geometry.frame.pivotY}
              orbit={orbit}
              width={cardWidth}
              height={cardHeight}
              radius={cardRadius}
              padding={cardPadding}
              paper={cardColor}
              border={borderColor}
              shadow={shadow}
              lift={lift}
              stagger={stagger}
              stiffness={stiffness}
              damping={damping}
              mass={mass}
              still={still}
              interactive={interactive}
              onEnter={enter}
              onLeave={leave}
            />
          );
        })}
      </div>
    </div>
  );
};

export default CardSpread;

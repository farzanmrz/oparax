"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { cn } from "@/lib/utils";
import gsap from "gsap";

export interface ParallaxCardsProps {
  /** Array of image URLs to display */
  images: string[];
  /** Number of cards to display (defaults to images.length, max 12) */
  cardCount?: number;
  /** 3D perspective strength in pixels */
  perspective?: number;
  /** Mouse movement sensitivity multiplier */
  mouseSensitivity?: number;
  /** Card width in pixels (responsive if not set) */
  cardWidth?: number;
  /** Card height in pixels (responsive if not set) */
  cardHeight?: number;
  /** Animation duration for position transitions in seconds */
  animationDuration?: number;
  /** Enable depth fog effect (fade and blur distant cards) */
  enableDepthFog?: boolean;
  /** Fog intensity multiplier */
  fogIntensity?: number;
  /** Enable magnetic attraction to mouse */
  enableMagneticAttraction?: boolean;
  /** Magnetic attraction strength */
  magneticStrength?: number;
  /** Callback when a card is clicked */
  onCardClick?: (index: number, imageUrl: string) => void;
  /** Additional CSS classes */
  className?: string;
}

interface SpatialConfig {
  posX: number;
  posY: number;
  depth: number;
  size: number;
  tiltX: number;
  tiltY: number;
}

const ParallaxCards = ({
  images,
  cardCount,
  perspective = 2500,
  mouseSensitivity = 3,
  cardWidth,
  cardHeight,
  animationDuration = 1.2,
  enableDepthFog = false,
  fogIntensity = 1,
  enableMagneticAttraction = false,
  magneticStrength = 50,
  onCardClick,
  className,
}: ParallaxCardsProps) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const elementsRef = useRef<(HTMLDivElement | null)[]>([]);
  const mousePositionRef = useRef({ x: 0, y: 0 });
  const [isVisible, setIsVisible] = useState(true);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [focusedCardIndex, setFocusedCardIndex] = useState<number | null>(null);

  const totalCards = Math.min(cardCount || images.length, 12);
  const visibleImages = images.slice(0, totalCards);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
      setPrefersReducedMotion(e.matches);
    };

    handleChange(mediaQuery);
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    const currentWrapper = wrapperRef.current;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsVisible(entry.isIntersecting);
        });
      },
      { threshold: 0.1 },
    );

    if (currentWrapper) {
      observer.observe(currentWrapper);
    }

    return () => {
      if (currentWrapper) {
        observer.unobserve(currentWrapper);
      }
    };
  }, []);

  const calculateSpatialLayout = useCallback((): SpatialConfig[] => {
    if (typeof window === "undefined") return [];

    const viewWidth = window.innerWidth;
    const viewHeight = window.innerHeight;

    const layouts: SpatialConfig[] = [
      {
        posX: -viewWidth * 0.25,
        posY: -viewHeight * 0.2,
        depth: -200,
        size: 0.9,
        tiltX: -5,
        tiltY: 5,
      },
      {
        posX: viewWidth * 0.25,
        posY: -viewHeight * 0.25,
        depth: -300,
        size: 0.85,
        tiltX: -3,
        tiltY: -4,
      },
      {
        posX: -viewWidth * 0.3,
        posY: viewHeight * 0.2,
        depth: -400,
        size: 0.8,
        tiltX: 4,
        tiltY: 6,
      },
      {
        posX: viewWidth * 0.3,
        posY: viewHeight * 0.25,
        depth: -500,
        size: 0.75,
        tiltX: 5,
        tiltY: -5,
      },
      {
        posX: 0,
        posY: -viewHeight * 0.3,
        depth: -700,
        size: 0.7,
        tiltX: -6,
        tiltY: 0,
      },
      {
        posX: -viewWidth * 0.35,
        posY: 0,
        depth: -800,
        size: 0.65,
        tiltX: 0,
        tiltY: 7,
      },
      {
        posX: viewWidth * 0.35,
        posY: 0,
        depth: -900,
        size: 0.6,
        tiltX: 0,
        tiltY: -7,
      },
      {
        posX: 0,
        posY: viewHeight * 0.3,
        depth: -1000,
        size: 0.55,
        tiltX: 6,
        tiltY: 0,
      },
      {
        posX: -viewWidth * 0.2,
        posY: -viewHeight * 0.15,
        depth: -1200,
        size: 0.5,
        tiltX: -3,
        tiltY: 3,
      },
      {
        posX: viewWidth * 0.2,
        posY: -viewHeight * 0.15,
        depth: -1300,
        size: 0.45,
        tiltX: -3,
        tiltY: -3,
      },
      {
        posX: -viewWidth * 0.2,
        posY: viewHeight * 0.15,
        depth: -1400,
        size: 0.4,
        tiltX: 3,
        tiltY: 3,
      },
      {
        posX: viewWidth * 0.2,
        posY: viewHeight * 0.15,
        depth: -1500,
        size: 0.35,
        tiltX: 3,
        tiltY: -3,
      },
    ];

    return layouts.slice(0, totalCards);
  }, [totalCards]);

  const calculateDepthFog = useCallback(
    (depth: number) => {
      if (!enableDepthFog) return { opacity: 1, blur: 0 };

      const maxDepth = 1500;
      const depthRatio = Math.abs(depth) / maxDepth;
      const opacity = Math.max(0.3, 1 - depthRatio * 0.7 * fogIntensity);
      const blur = depthRatio * 8 * fogIntensity;

      return { opacity, blur };
    },
    [enableDepthFog, fogIntensity],
  );

  const arrangeElements = useCallback(
    (focusIndex?: number | null) => {
      const spatialConfigs = calculateSpatialLayout();

      elementsRef.current.forEach((element, idx) => {
        if (!element || !spatialConfigs[idx]) return;

        const config = spatialConfigs[idx];
        const layerIndex = 1000 - Math.round(Math.abs(config.depth));
        const isFocused = focusIndex === idx;

        const fogEffect = calculateDepthFog(config.depth);

        gsap.to(element, {
          x: isFocused ? 0 : config.posX,
          y: isFocused ? 0 : config.posY,
          z: isFocused ? 100 : config.depth,
          rotationX: isFocused ? 0 : config.tiltX,
          rotationY: isFocused ? 0 : config.tiltY,
          scale: isFocused ? 1.1 : config.size,
          zIndex: isFocused ? 2000 : layerIndex,
          opacity: isFocused ? 1 : fogEffect.opacity,
          filter: isFocused ? "blur(0px)" : `blur(${fogEffect.blur}px)`,
          duration: animationDuration,
          ease: "power2.inOut",
        });
      });
    },
    [calculateSpatialLayout, animationDuration, calculateDepthFog],
  );

  const applyMagneticEffect = useCallback(() => {
    if (!enableMagneticAttraction || !isVisible || prefersReducedMotion) return;

    const spatialConfigs = calculateSpatialLayout();

    elementsRef.current.forEach((element, idx) => {
      if (!element || !spatialConfigs[idx] || focusedCardIndex === idx) return;

      const rect = element.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const deltaX = mousePositionRef.current.x - centerX;
      const deltaY = mousePositionRef.current.y - centerY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      const maxDistance = 500;
      const influence = Math.max(0, 1 - distance / maxDistance);

      const offsetX = (deltaX / distance) * influence * magneticStrength;
      const offsetY = (deltaY / distance) * influence * magneticStrength;

      const config = spatialConfigs[idx];

      gsap.to(element, {
        x: config.posX + (isNaN(offsetX) ? 0 : offsetX),
        y: config.posY + (isNaN(offsetY) ? 0 : offsetY),
        duration: 0.8,
        ease: "power2.out",
      });
    });
  }, [
    enableMagneticAttraction,
    magneticStrength,
    calculateSpatialLayout,
    isVisible,
    prefersReducedMotion,
    focusedCardIndex,
  ]);

  const handlePointerMove = useCallback(
    (event: MouseEvent) => {
      if (
        !wrapperRef.current ||
        !stageRef.current ||
        !isVisible ||
        prefersReducedMotion
      )
        return;

      mousePositionRef.current = {
        x: event.clientX,
        y: event.clientY,
      };

      if (focusedCardIndex !== null) return;

      const bounds = wrapperRef.current.getBoundingClientRect();
      const normalizedX = (event.clientX - bounds.left) / bounds.width - 0.5;
      const normalizedY = (event.clientY - bounds.top) / bounds.height - 0.5;

      gsap.to(stageRef.current, {
        rotationY: normalizedX * mouseSensitivity,
        rotationX: -normalizedY * mouseSensitivity,
        duration: 1.2,
        ease: "power1.out",
      });

      applyMagneticEffect();
    },
    [
      mouseSensitivity,
      applyMagneticEffect,
      isVisible,
      prefersReducedMotion,
      focusedCardIndex,
    ],
  );

  const handleCardClick = useCallback(
    (idx: number, imageUrl: string) => {
      if (focusedCardIndex === idx) {
        setFocusedCardIndex(null);
        arrangeElements(null);

        if (stageRef.current) {
          gsap.to(stageRef.current, {
            rotationY: 0,
            rotationX: 0,
            duration: animationDuration,
            ease: "power2.inOut",
          });
        }
      } else {
        setFocusedCardIndex(idx);
        arrangeElements(idx);

        if (stageRef.current) {
          gsap.to(stageRef.current, {
            rotationY: 0,
            rotationX: 0,
            duration: animationDuration,
            ease: "power2.inOut",
          });
        }
      }

      onCardClick?.(idx, imageUrl);
    },
    [focusedCardIndex, arrangeElements, animationDuration, onCardClick],
  );

  useEffect(() => {
    if (!isVisible || prefersReducedMotion) return;

    arrangeElements(focusedCardIndex);

    const wrapper = wrapperRef.current;
    if (wrapper) {
      wrapper.addEventListener("mousemove", handlePointerMove);
    }

    const handleWindowResize = () => {
      arrangeElements(focusedCardIndex);
    };
    window.addEventListener("resize", handleWindowResize);

    return () => {
      if (wrapper) {
        wrapper.removeEventListener("mousemove", handlePointerMove);
      }
      window.removeEventListener("resize", handleWindowResize);
    };
  }, [
    arrangeElements,
    handlePointerMove,
    isVisible,
    prefersReducedMotion,
    focusedCardIndex,
  ]);

  useEffect(() => {
    arrangeElements(focusedCardIndex);
  }, [images, cardCount, arrangeElements, focusedCardIndex]);

  useEffect(() => {
    if (prefersReducedMotion && stageRef.current) {
      gsap.set(stageRef.current, {
        rotationY: 0,
        rotationX: 0,
      });
    }
  }, [prefersReducedMotion]);

  return (
    <div
      ref={wrapperRef}
      className={cn(
        "relative w-full h-full overflow-hidden",
        "flex items-center justify-center",
        className,
      )}
      style={{
        perspective: `${perspective}px`,
      }}
      onClick={(e) => {
        console.log("Wrapper clicked", e.target);
      }}
    >
      <div
        ref={stageRef}
        className="absolute inset-0 flex items-center justify-center"
        style={{
          transformStyle: "preserve-3d",
          pointerEvents: "none",
        }}
      >
        {visibleImages.map((imageUrl, idx) => (
          <button
            key={idx}
            ref={(el) => {
              elementsRef.current[idx] = el as HTMLDivElement | null;
            }}
            onClick={(e) => {
              e.stopPropagation();
              console.log("Card clicked!", idx, imageUrl);
              handleCardClick(idx, imageUrl);
            }}
            type="button"
            className={cn(
              "absolute rounded-lg overflow-hidden shadow-2xl",
              "bg-cover bg-center cursor-pointer",
              "will-change-transform transition-opacity",
              "border-0 outline-none focus:outline-none",
              focusedCardIndex === idx && "ring-4 ring-white/50",
            )}
            style={{
              width: cardWidth || "min(430px, 90vw)",
              height: cardHeight || "min(610px, 130vw)",
              backgroundImage: `url(${imageUrl})`,
              transformStyle: "preserve-3d",
              pointerEvents: "auto",
              userSelect: "none",
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default ParallaxCards;

"use client";

import {
  motion,
  AnimatePresence,
  useMotionValue,
  useSpring,
  useTransform,
} from "motion/react";
import { useState, useRef, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";

export interface HoverTarget {
  /** The text to highlight and make interactive */
  text: string;
  /** URL of the image to display on hover */
  imageUrl: string;
  /** Optional URL to navigate to on click */
  linkUrl?: string;
  /** Optional alt text for the image */
  altText?: string;
}

export interface HoverPreviewProps {
  /** Text content with placeholders for targets (use {0}, {1}, etc.) */
  content: string;
  /** Array of target configurations */
  targets: HoverTarget[];
  /** Callback when a target is clicked */
  onTargetClick?: (target: HoverTarget, index: number) => void;
  /** Position of the image relative to the target text */
  imagePosition?: "above" | "below" | "left" | "right";
  /** Enter animation duration in seconds */
  enterSpeed?: number;
  /** Exit animation duration in seconds */
  exitSpeed?: number;
  /** Maximum rotation angle for the image (in degrees) */
  maxRotation?: number;
  /** Maximum offset for image movement (in pixels) */
  maxOffset?: number;
  /** Image width in pixels */
  imageWidth?: number;
  /** Image height in pixels */
  imageHeight?: number;
  /** Additional CSS classes for the container */
  className?: string;
  /** Additional CSS classes for target text */
  targetClassName?: string;
  /** Padding around target text to expand hover area (in pixels) */
  targetPadding?: number;
  /** Image border radius */
  imageBorderRadius?: string;
  /** Show shadow on image */
  showImageShadow?: boolean;
}

const HoverPreview = ({
  content,
  targets,
  onTargetClick,
  imagePosition = "above",
  enterSpeed = 0.2,
  exitSpeed = 0.15,
  maxRotation = 12,
  maxOffset = 15,
  imageWidth = 200,
  imageHeight = 200,
  className,
  targetClassName,
  targetPadding = 4,
  imageBorderRadius = "0.75rem",
  showImageShadow = true,
}: HoverPreviewProps) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const targetRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    targets.forEach((target) => {
      const img = new Image();
      img.src = target.imageUrl;
    });
  }, [targets]);

  const cursorX = useMotionValue(0);
  const cursorY = useMotionValue(0);
  const rotation = useMotionValue(0);
  const offsetX = useMotionValue(0);
  const offsetY = useMotionValue(0);

  const smoothCursorX = useSpring(cursorX, { stiffness: 250, damping: 20 });
  const smoothCursorY = useSpring(cursorY, { stiffness: 250, damping: 20 });
  const smoothRotation = useSpring(rotation, { stiffness: 150, damping: 15 });
  const smoothOffsetX = useSpring(offsetX, { stiffness: 150, damping: 15 });
  const smoothOffsetY = useSpring(offsetY, { stiffness: 150, damping: 15 });

  const finalX = useTransform(() => {
    const spacing = 24;
    const cx = smoothCursorX.get();
    const ox = smoothOffsetX.get();
    switch (imagePosition) {
      case "left":
        return cx - imageWidth - spacing + ox;
      case "right":
        return cx + spacing + ox;
      case "above":
      case "below":
      default:
        return cx - imageWidth / 2 + ox;
    }
  });

  const finalY = useTransform(() => {
    const spacing = 24;
    const cy = smoothCursorY.get();
    const oy = smoothOffsetY.get();
    switch (imagePosition) {
      case "above":
        return cy - imageHeight - spacing + oy;
      case "below":
        return cy + spacing + oy;
      case "left":
      case "right":
      default:
        return cy - imageHeight / 2 + oy;
    }
  });

  const handleMouseEnter = useCallback(
    (index: number, event: React.MouseEvent<HTMLSpanElement>) => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }

      const isFirstHover = !isVisible;

      if (isFirstHover) {
        cursorX.jump(event.clientX);
        cursorY.jump(event.clientY);
        smoothCursorX.jump(event.clientX);
        smoothCursorY.jump(event.clientY);

        rotation.jump(0);
        smoothRotation.jump(0);

        offsetX.jump(0);
        smoothOffsetX.jump(0);

        offsetY.jump(0);
        smoothOffsetY.jump(0);
      }

      setHoveredIndex(index);
      setIsVisible(true);
    },
    [
      isVisible,
      cursorX,
      cursorY,
      smoothCursorX,
      smoothCursorY,
      rotation,
      smoothRotation,
      offsetX,
      smoothOffsetX,
      offsetY,
      smoothOffsetY,
    ],
  );

  const handleMouseMove = useCallback(
    (index: number, event: React.MouseEvent<HTMLSpanElement>) => {
      if (hoveredIndex !== index) return;

      const currentX = event.clientX;
      const currentY = event.clientY;
      cursorX.set(currentX);
      cursorY.set(currentY);

      const target = event.currentTarget;
      const rect = target.getBoundingClientRect();

      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const deltaX = currentX - centerX;
      const deltaY = currentY - centerY;

      const rot = Math.max(
        -maxRotation,
        Math.min(maxRotation, (deltaX / rect.width) * maxRotation * 2),
      );

      const offX = Math.max(
        -maxOffset,
        Math.min(maxOffset, (deltaX / rect.width) * maxOffset * 2),
      );
      const offY = Math.max(
        -maxOffset,
        Math.min(maxOffset, (deltaY / rect.height) * maxOffset * 2),
      );

      rotation.set(rot);
      offsetX.set(offX);
      offsetY.set(offY);
    },
    [
      hoveredIndex,
      maxRotation,
      maxOffset,
      cursorX,
      cursorY,
      rotation,
      offsetX,
      offsetY,
    ],
  );

  const handleMouseLeave = useCallback(() => {
    hideTimeoutRef.current = setTimeout(() => {
      setHoveredIndex(null);
      setIsVisible(false);
    }, 50);
  }, []);

  const handleClick = useCallback(
    (target: HoverTarget, index: number) => {
      if (onTargetClick) {
        onTargetClick(target, index);
      } else if (target.linkUrl) {
        window.open(target.linkUrl, "_blank", "noopener,noreferrer");
      }
    },
    [onTargetClick],
  );

  const renderContent = () => {
    const parts: (string | React.ReactElement)[] = [];
    let lastIndex = 0;

    const placeholderRegex = /\{(\d+)\}/g;
    let match;

    while ((match = placeholderRegex.exec(content)) !== null) {
      const placeholderIndex = parseInt(match[1], 10);

      if (match.index > lastIndex) {
        parts.push(content.slice(lastIndex, match.index));
      }

      if (targets[placeholderIndex]) {
        const target = targets[placeholderIndex];
        parts.push(
          <span
            key={`target-${placeholderIndex}`}
            ref={(el) => {
              targetRefs.current[placeholderIndex] = el;
            }}
            onMouseEnter={(e) => handleMouseEnter(placeholderIndex, e)}
            onMouseMove={(e) => handleMouseMove(placeholderIndex, e)}
            onMouseLeave={handleMouseLeave}
            onClick={() => handleClick(target, placeholderIndex)}
            className={cn(
              "relative cursor-pointer transition-colors",
              targetClassName,
            )}
            style={{
              padding: `${targetPadding}px`,
              margin: `-${targetPadding}px`,
            }}
          >
            {target.text}
          </span>,
        );
      }

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < content.length) {
      parts.push(content.slice(lastIndex));
    }

    return parts;
  };

  return (
    <div className={cn("relative", className)}>
      {renderContent()}

      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{
          opacity: isVisible ? 1 : 0,
          scale: isVisible ? 1 : 0.85,
        }}
        transition={{
          duration: isVisible ? enterSpeed : exitSpeed,
          ease: isVisible ? "easeOut" : "easeIn",
        }}
        style={{
          position: "fixed",
          left: 0,
          top: 0,
          x: finalX,
          y: finalY,
          width: imageWidth,
          height: imageHeight,
          rotate: smoothRotation,
          pointerEvents: "none",
          zIndex: 9999,
          willChange: "transform, opacity",
        }}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {hoveredIndex !== null && targets[hoveredIndex] && (
            <motion.div
              key={`image-${hoveredIndex}`}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="absolute top-0 left-0 w-full h-full"
            >
              <img
                src={targets[hoveredIndex].imageUrl}
                alt={
                  targets[hoveredIndex].altText || targets[hoveredIndex].text
                }
                width={imageWidth}
                height={imageHeight}
                className={cn("object-cover", showImageShadow && "shadow-2xl")}
                style={{
                  borderRadius: imageBorderRadius,
                  width: imageWidth,
                  height: imageHeight,
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

HoverPreview.displayName = "HoverPreview";

export default HoverPreview;

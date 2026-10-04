"use client";

// Adapted from React Bits CardSwap, David Haz. License: ./LICENSE.md.
// A reader selects the front source. Automatic cycling would hide evidence before it can be read.
import { gsap } from "gsap";
import {
  Children,
  cloneElement,
  createRef,
  forwardRef,
  isValidElement,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export const SourceCard = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...rest }, ref) => (
    <div ref={ref} {...rest} className={`d4-swap-card ${className ?? ""}`} />
  ),
);
SourceCard.displayName = "SourceCard";

const makeSlot = (i: number, distX: number, distY: number, total: number) => ({
  x: i * distX,
  y: -i * distY,
  z: -i * distX * 1.5,
  zIndex: total - i,
});
const placeNow = (el: HTMLElement, slot: ReturnType<typeof makeSlot>, skew: number) =>
  gsap.set(el, {
    ...slot,
    xPercent: -50,
    yPercent: -50,
    skewY: skew,
    transformOrigin: "center center",
    force3D: true,
  });

export default function SourceCardSwap({
  activeIndex,
  children,
}: {
  activeIndex: number;
  children: ReactNode;
}) {
  const childArr = Children.toArray(children);
  const refs = useMemo(() => childArr.map(() => createRef<HTMLDivElement>()), [childArr.length]);
  const mounted = useRef(false);
  const [plain, setPlain] = useState(true);
  const order = useMemo(
    () => childArr.map((_, index) => (activeIndex + index) % childArr.length),
    [activeIndex, childArr.length],
  );

  useLayoutEffect(() => {
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const mobile = matchMedia("(max-width: 699px)");
    const update = () => setPlain(motion.matches || mobile.matches);
    update();
    motion.addEventListener("change", update);
    mobile.addEventListener("change", update);
    return () => {
      motion.removeEventListener("change", update);
      mobile.removeEventListener("change", update);
    };
  }, []);

  useLayoutEffect(() => {
    if (plain) {
      for (const ref of refs) if (ref.current) gsap.set(ref.current, { clearProps: "all" });
      mounted.current = false;
      return;
    }
    order.forEach((index, slotIndex) => {
      const element = refs[index].current;
      if (!element) return;
      const slot = makeSlot(slotIndex, 24, 33, refs.length);
      const skewY = slotIndex === 0 ? 0 : -3;
      if (!mounted.current) placeNow(element, slot, skewY);
      else {
        gsap.set(element, { zIndex: slot.zIndex });
        gsap.to(element, { ...slot, skewY, duration: 0.6, ease: "power3.out", overwrite: true });
      }
    });
    mounted.current = true;
    return () => {
      for (const ref of refs) if (ref.current) gsap.killTweensOf(ref.current);
    };
  }, [order, refs, plain]);

  return (
    <div
      className={`d4-card-swap ${plain ? "d4-swap-plain" : ""}`}
      data-catalog="React Bits CardSwap, controlled source deck"
    >
      {childArr.map((child, index) =>
        isValidElement<HTMLAttributes<HTMLDivElement>>(child)
          ? cloneElement(
              child as ReactElement<
                HTMLAttributes<HTMLDivElement> & { ref?: React.Ref<HTMLDivElement> }
              >,
              {
                ref: refs[index],
                "aria-hidden": index !== activeIndex,
                inert: index !== activeIndex,
                className: `${child.props.className ?? ""} ${index === activeIndex ? "d4-swap-front" : "d4-swap-back"}`,
              },
            )
          : child,
      )}
    </div>
  );
}

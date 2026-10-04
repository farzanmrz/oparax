"use client";

import React, { useRef, useState, useEffect } from "react";
import { motion, useSpring, useMotionValue } from "motion/react";
import { ReactLenis } from "lenis/react";
import { cn } from "@/lib/utils";

export interface DeviceProps {
  /** Image URL for the device screen */
  image?: string;

  /** Scale factor for the device size (0.5 to 1.5) */
  scale?: number;

  /** Whether the image can scroll vertically (for long screenshots) */
  isScrollable?: boolean;

  /** Enable parallax effect on hover */
  enableParallax?: boolean;

  /** Parallax movement strength in pixels (default: 15) */
  parallaxStrength?: number;

  /** Enable rotation effect on hover */
  enableRotate?: boolean;

  /** Rotation strength in degrees (default: 3) */
  rotateStrength?: number;

  /** Auto-animate with simulated cursor movement */
  autoAnimate?: boolean;

  /** Additional CSS classes for the wrapper */
  className?: string;

  /** Content to display inside the device screen */
  children?: React.ReactNode;
}

const Device = React.forwardRef<HTMLDivElement, DeviceProps>(
  (
    {
      image = "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&q=80",
      scale = 1,
      isScrollable = false,
      enableParallax = true,
      parallaxStrength = 15,
      enableRotate = true,
      rotateStrength = 3,
      autoAnimate = false,
      className,
      children,
    },
    ref,
  ) => {
    const deviceRef = useRef<HTMLDivElement>(null);
    const [isHovering, setIsHovering] = useState(false);
    const animationFrameRef = useRef<number | undefined>(undefined);

    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const rotateX = useMotionValue(0);
    const rotateY = useMotionValue(0);
    const rotateZ = useMotionValue(0);

    const springX = useSpring(x, {
      stiffness: 200,
      damping: 25,
      mass: 0.5,
    });
    const springY = useSpring(y, {
      stiffness: 200,
      damping: 25,
      mass: 0.5,
    });
    const springRotateX = useSpring(rotateX, {
      stiffness: 200,
      damping: 25,
      mass: 0.5,
    });
    const springRotateY = useSpring(rotateY, {
      stiffness: 200,
      damping: 25,
      mass: 0.5,
    });
    const springRotateZ = useSpring(rotateZ, {
      stiffness: 200,
      damping: 25,
      mass: 0.5,
    });

    useEffect(() => {
      if (!autoAnimate) return;

      let time = 0;
      const animate = () => {
        time += 0.005;

        const mouseX = Math.sin(time) * 0.8;
        const mouseY = Math.sin(time * 1.3) * 0.6;

        if (enableParallax) {
          x.set(mouseX * parallaxStrength);
          y.set(-mouseY * parallaxStrength);
        }

        if (enableRotate) {
          rotateX.set(-mouseY * rotateStrength);
          rotateY.set(mouseX * rotateStrength);
          rotateZ.set(mouseX * rotateStrength * 0.5);
        }

        animationFrameRef.current = requestAnimationFrame(animate);
      };

      animationFrameRef.current = requestAnimationFrame(animate);

      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    }, [
      autoAnimate,
      enableParallax,
      enableRotate,
      parallaxStrength,
      rotateStrength,
      x,
      y,
      rotateX,
      rotateY,
      rotateZ,
    ]);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
      if (autoAnimate || !deviceRef.current) return;

      const rect = deviceRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const mouseX = (e.clientX - centerX) / (rect.width / 2);
      const mouseY = (e.clientY - centerY) / (rect.height / 2);

      if (enableParallax) {
        x.set(mouseX * parallaxStrength);
        y.set(-mouseY * parallaxStrength);
      }

      if (enableRotate) {
        rotateX.set(-mouseY * rotateStrength);
        rotateY.set(mouseX * rotateStrength);
        rotateZ.set(mouseX * rotateStrength * 0.5);
      }
    };

    const handleMouseEnter = () => {
      if (!autoAnimate) {
        setIsHovering(true);
      }
    };

    const handleMouseLeave = () => {
      if (!autoAnimate) {
        setIsHovering(false);
        x.set(0);
        y.set(0);
        rotateX.set(0);
        rotateY.set(0);
        rotateZ.set(0);
      }
    };

    const scaleStyle = {
      transform: `scale(${scale})`,
      transformOrigin: "center center",
    };

    const screenContent = isScrollable ? (
      <ReactLenis
        options={{
          lerp: 0.1,
          duration: 1.2,
          smoothWheel: true,
        }}
        className={cn(
          "absolute inset-[1.9rem] overflow-y-auto scrollbar-hide rounded-[5rem]",
        )}
      >
        {children ? (
          children
        ) : (
          <img
            src={image}
            alt="Device screen"
            className="w-full h-auto min-h-full object-cover object-top"
            draggable={false}
          />
        )}
      </ReactLenis>
    ) : (
      <div
        className={cn("absolute inset-[1.9rem] overflow-hidden rounded-[5rem]")}
      >
        {children ? (
          children
        ) : (
          <img
            src={image}
            alt="Device screen"
            className="w-full h-full object-cover object-top"
            draggable={false}
          />
        )}
      </div>
    );

    return (
      <div
        ref={ref}
        className={cn("relative inline-block", className)}
        style={scaleStyle}
      >
        <motion.div
          ref={deviceRef}
          onMouseMove={handleMouseMove}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          style={{
            x: springX,
            y: springY,
            rotateX: springRotateX,
            rotateY: springRotateY,
            rotateZ: springRotateZ,
            transformStyle: "preserve-3d",
            display: "inline-block",
          }}
          animate={{
            scale: isHovering || autoAnimate ? 1.02 : 1,
          }}
          transition={{
            scale: {
              type: "spring",
              stiffness: 300,
              damping: 25,
            },
          }}
          className="relative"
        >
          <div
            className={cn(
              "relative w-[35.6rem] h-[72.2rem] rounded-[6rem] flex justify-center select-none",
              "bg-black transition-shadow duration-300",
            )}
            style={{
              boxShadow:
                isHovering || autoAnimate
                  ? "0 30px 60px -12px rgba(0, 0, 0, 0.3), 0 18px 36px -18px rgba(0, 0, 0, 0.25)"
                  : "0 0 2rem 1rem rgba(0, 0, 0, 0.1)",
            }}
          >
            {screenContent}

            <div className="absolute top-[2.8rem] left-1/2 -translate-x-1/2 w-[12.6rem] h-[3.7rem] bg-black rounded-[3rem] z-10 flex items-center justify-between px-6">
              <div className="flex gap-1 shrink-0">
                <div
                  className="w-[0.4rem] h-[0.4rem] rounded-full"
                  style={{
                    backgroundColor: "#1a1a2e",
                    border: "0.1rem solid #0a0a15",
                  }}
                />
                <div
                  className="w-[0.4rem] h-[0.4rem] rounded-full"
                  style={{
                    backgroundColor: "#1a1a2e",
                    border: "0.1rem solid #0a0a15",
                  }}
                />
              </div>

              <div className="flex-1 flex items-center justify-center gap-[0.15rem] mx-3">
                {[...Array(8)].map((_, i) => (
                  <div
                    key={i}
                    className="w-[0.15rem] h-[1.2rem] bg-[#0a0a15] rounded-full opacity-60"
                  />
                ))}
              </div>

              <div
                className="w-[1.1rem] h-[1.1rem] rounded-full shrink-0"
                style={{
                  backgroundColor: "#1a1a2e",
                  border: "0.15rem solid #0a0a15",
                  boxShadow: "inset 0 0 0.3rem rgba(0, 100, 200, 0.5)",
                }}
              />
            </div>

            <div
              className="absolute top-[9.8rem] left-[-0.2rem] w-[0.3rem] h-10 bg-[#484848] rounded-tl-[0.3rem] rounded-bl-[0.3rem]"
              style={{
                border: "0.1rem solid rgba(0, 0, 0, 0.1)",
                borderRight: "none",
              }}
            />

            <div
              className="absolute top-60 left-[-0.2rem] w-[0.3rem] h-20 bg-[#484848] rounded-tl-[0.3rem] rounded-bl-[0.3rem]"
              style={{
                border: "0.1rem solid rgba(0, 0, 0, 0.1)",
                borderRight: "none",
              }}
            />

            <div
              className="absolute top-[21.6rem] left-[-0.2rem] w-[0.3rem] h-20 bg-[#484848] rounded-tl-[0.3rem] rounded-bl-[0.3rem]"
              style={{
                border: "0.1rem solid rgba(0, 0, 0, 0.1)",
                borderRight: "none",
              }}
            />

            <div
              className="absolute top-[16.9rem] right-[-0.3rem] w-[0.3rem] h-20 bg-[#484848] rounded-tl-[0.3rem] rounded-bl-[0.3rem]"
              style={{
                border: "0.1rem solid rgba(0, 0, 0, 0.1)",
                borderRight: "none",
                transform: "rotate(180deg)",
              }}
            />

            <div className="absolute inset-0 border-[0.4rem] border-[#484848] rounded-[6rem] pointer-events-none" />

            <div className="absolute inset-[0.3rem] border-[1.6rem] border-black rounded-[5.6rem] pointer-events-none" />

            <div
              className="absolute inset-[1.1rem] border-[0.3rem] border-[#484848] rounded-[5rem] pointer-events-none opacity-50"
              style={{ filter: "blur(1px)" }}
            />

            <div
              className="absolute inset-[0.7rem] border-[0.4rem] border-[#bcbcbc] rounded-[5.6rem] pointer-events-none opacity-50"
              style={{ filter: "blur(1px)" }}
            />
          </div>
        </motion.div>
      </div>
    );
  },
);

Device.displayName = "Device";

export default Device;

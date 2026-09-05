"use client";
import React, { useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";

interface BlurTextProps {
  text?: string;
  delay?: number;
  className?: string;
  animateBy?: "words" | "letters";
  direction?: "top" | "bottom";
  threshold?: number;
  rootMargin?: string;
  animationFrom?: Record<string, any>;
  animationTo?: Array<Record<string, any>> | Record<string, any>;
  easing?: string;
  onAnimationComplete?: () => void;
}

export default function BlurText({
  text = "",
  delay = 100,
  className = "",
  animateBy = "words",
  direction = "top",
  threshold = 0.1,
  rootMargin = "-50px",
  animationFrom,
  animationTo,
  easing = "easeOut",
  onAnimationComplete,
}: BlurTextProps) {
  const elements = animateBy === "words" ? text.split(" ") : text.split("");
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (ref.current) observer.unobserve(ref.current);
        }
      },
      { threshold, rootMargin }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  const defaultFrom =
    direction === "top"
      ? { filter: "blur(12px)", opacity: 0, transform: "translate3d(0,-24px,0)" }
      : { filter: "blur(12px)", opacity: 0, transform: "translate3d(0,24px,0)" };

  const defaultTo = [
    {
      filter: "blur(4px)",
      opacity: 0.6,
      transform: direction === "top" ? "translate3d(0,4px,0)" : "translate3d(0,-4px,0)",
    },
    { filter: "blur(0px)", opacity: 1, transform: "translate3d(0,0,0)" },
  ];

  return (
    <p ref={ref} className={`inline-flex flex-wrap gap-x-2 ${className}`}>
      {elements.map((element, i) => (
        <motion.span
          key={i}
          initial={(animationFrom || defaultFrom) as any}
          animate={(inView ? (animationTo || defaultTo) : (animationFrom || defaultFrom)) as any}
          transition={{
            duration: 0.45,
            delay: (i * delay) / 1000,
            ease: easing as any,
          }}
          onAnimationComplete={i === elements.length - 1 ? onAnimationComplete : undefined}
          className="inline-block will-change-[transform,filter,opacity]"
        >
          {element === " " ? "\u00A0" : element}
        </motion.span>
      ))}
    </p>
  );
}

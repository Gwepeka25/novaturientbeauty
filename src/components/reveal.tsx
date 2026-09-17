"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";

/**
 * Wraps content that should fade/slide in once scrolled into view. Renders
 * fully visible by default — the hidden state is only ever applied by JS
 * right before the reveal, so a JS error, slow hydration, or a
 * fullPage/anchor-jump screenshot never leaves content permanently hidden.
 */
export function Reveal({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (prefersReducedMotion) return;

    if (el.getBoundingClientRect().top < window.innerHeight) return;

    el.classList.add("is-hidden");
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.remove("is-hidden");
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="reveal">
      {children}
    </div>
  );
}

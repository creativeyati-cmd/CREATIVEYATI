"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import SplitType from "split-type";

export default function PublicTextReveal({ children, as: Tag = "div", className = "" }) {
  const root = useRef(null);

  useLayoutEffect(() => {
    const element = root.current;
    if (!element || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;

    let cancelled = false;
    const splits = [];
    const animations = [];

    const setup = () => {
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);
      const targets = Array.from(element.querySelectorAll("[data-reveal]"));

      targets.forEach((target) => {
        const split = new SplitType(target, { types: "lines", tagName: "span", lineClass: "text-reveal-line" });
        splits.push(split);
        split.lines.forEach((line) => {
          const mask = document.createElement("span");
          mask.className = "text-reveal-mask";
          line.parentNode?.insertBefore(mask, line);
          mask.appendChild(line);
        });
        const animation = gsap.fromTo(split.lines, { yPercent: 112, autoAlpha: 0, filter: "blur(8px)" }, {
          yPercent: 0,
          autoAlpha: 1,
          filter: "blur(0px)",
          duration: 0.82,
          stagger: 0.075,
          ease: "power3.out",
          scrollTrigger: { trigger: target, start: "top 80%", once: true },
        });
        animations.push(animation);
      });
      ScrollTrigger.refresh();
    };

    if (document.fonts?.ready) document.fonts.ready.then(setup);
    else setup();

    return () => {
      cancelled = true;
      animations.forEach((animation) => { animation.scrollTrigger?.kill(); animation.kill(); });
      splits.forEach((split) => split.revert());
    };
  }, []);

  return <Tag className={className} ref={root}>{children}</Tag>;
}

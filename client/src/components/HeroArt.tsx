import { useEffect, useRef } from "react";

/**
 * Editorial image for heroes: reveals with a clip, then drifts slowly (a quiet Ken Burns) and shifts
 * a little with the scroll. With reduced motion it simply fades in.
 */
export default function HeroArt({ src, alt = "", caption, className = "", position = "center" }: { src: string; alt?: string; caption?: string; className?: string; position?: string }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = element.getBoundingClientRect();
      const progress = Math.max(-1, Math.min(1, (rect.top + rect.height / 2 - window.innerHeight / 2) / window.innerHeight));
      element.style.setProperty("--hero-art-shift", `${(progress * -6).toFixed(2)}%`);
    };
    const onScroll = () => { if (!frame) frame = window.requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); if (frame) window.cancelAnimationFrame(frame); };
  }, []);
  return <figure ref={ref} className={`hero-art ${className}`.trim()}>
    <span className="hero-art__frame"><img src={src} alt={alt} style={{ objectPosition: position }} /></span>
    {caption && <figcaption>{caption}</figcaption>}
  </figure>;
}

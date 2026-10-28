import { useEffect } from "react";

const selectors = [
  "main > section",
  ".story-card",
  ".archive-card",
  ".trend-item",
  ".subpage-story",
  ".runway-card",
  ".brand-editorial",
  ".brand-next",
  ".article-body",
  ".public-block",
];

export default function ScrollAnimations() {
  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const selector = selectors.join(",");
    const observer = reduceMotion ? null : new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-scroll-visible");
          observer?.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -7% 0px" });

    const prepare = (root: ParentNode = document) => {
      root.querySelectorAll<HTMLElement>(selector).forEach((element) => {
        if (element.classList.contains("scroll-ready")) return;
        element.classList.add("scroll-ready");
        if (reduceMotion) element.classList.add("is-scroll-visible");
        else observer?.observe(element);
      });
    };

    prepare();
    const mutationObserver = new MutationObserver(() => prepare());
    mutationObserver.observe(document.body, { childList: true, subtree: true });

    let lastScrollY = window.scrollY;
    let compactNav = lastScrollY > 180;
    let ticking = false;
    const updateScrollDirection = () => {
      const currentScrollY = window.scrollY;
      if (!reduceMotion && Math.abs(currentScrollY - lastScrollY) > 8) {
        // Hysteresis prevents tiny touch/trackpad rebounds from flashing the logo.
        if (currentScrollY > 180) compactNav = true;
        if (currentScrollY < 120) compactNav = false;
        document.body.classList.toggle("is-scrolling-down", compactNav);
        document.body.classList.toggle("is-scrolling-up", !compactNav);
        lastScrollY = currentScrollY;
      }
      ticking = false;
    };
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(updateScrollDirection);
        ticking = true;
      }
    };
    if (!reduceMotion) window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      mutationObserver.disconnect();
      observer?.disconnect();
      window.removeEventListener("scroll", onScroll);
      document.body.classList.remove("is-scrolling-down", "is-scrolling-up");
    };
  }, []);

  return null;
}

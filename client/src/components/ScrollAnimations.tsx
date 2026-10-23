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

    return () => {
      mutationObserver.disconnect();
      observer?.disconnect();
    };
  }, []);

  return null;
}

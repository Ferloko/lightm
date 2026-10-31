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
  ".magazine-catalog",
  ".magazine-card",
  ".info-marquee",
];

export default function ScrollAnimations() {
  useEffect(() => {
    const selector = selectors.join(",");
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-scroll-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -7% 0px" });

    const prepare = (root: ParentNode = document) => {
      root.querySelectorAll<HTMLElement>(selector).forEach((element) => {
        if (element.classList.contains("scroll-ready")) return;
        element.classList.add("scroll-ready");
        observer.observe(element);
      });
    };

    prepare();
    const mutationObserver = new MutationObserver(() => prepare());
    mutationObserver.observe(document.body, { childList: true, subtree: true });

    let compactNav = window.scrollY > 180;
    let ticking = false;
    const updateScrollDirection = () => {
      const currentScrollY = window.scrollY;
      // The compact header is threshold-based, not gesture-based, so small
      // touchpad rebounds cannot make the navigation flash or get stuck.
      if (currentScrollY > 180) compactNav = true;
      if (currentScrollY < 80) compactNav = false;
      document.body.classList.toggle("is-scrolling-down", compactNav);
      document.body.classList.toggle("is-scrolling-up", false);
      ticking = false;
    };
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(updateScrollDirection);
        ticking = true;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      mutationObserver.disconnect();
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      document.body.classList.remove("is-scrolling-down", "is-scrolling-up");
    };
  }, []);

  return null;
}

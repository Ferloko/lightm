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
  ".masthead-person",
  ".masthead-grid > li",
  ".about-pillar",
  ".archive-article-card",
];

const STAGGER_MS = 90;
const MAX_STAGGER = 4;
const REVEAL_MS = 1000;

export default function ScrollAnimations() {
  useEffect(() => {
    const root = document.documentElement;
    const selector = selectors.join(",");
    const timers = new Set<number>();

    // Once revealed, the element goes back to its own styles so its hover transitions are not slowed down.
    const release = (element: HTMLElement) => {
      const delay = Number.parseFloat(element.style.getPropertyValue("--reveal-delay")) || 0;
      const timer = window.setTimeout(() => { timers.delete(timer); element.dataset.scrollRevealed = "1"; element.classList.remove("scroll-ready", "is-scroll-visible"); element.style.removeProperty("--reveal-delay"); }, REVEAL_MS + delay);
      timers.add(timer);
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        // While the intro curtain is down, keep everything waiting so it enters as the curtain lifts.
        if (!entry.isIntersecting || root.classList.contains("light-intro-active")) return;
        const element = entry.target as HTMLElement;
        element.classList.add("is-scroll-visible");
        observer.unobserve(element);
        release(element);
      });
    // Reveal once the top edge crosses 88% of the viewport. Unlike a visibility ratio, this also
    // works for blocks taller than the screen (long article bodies), which could never reach 12%.
    }, { threshold: 0, rootMargin: "0px 0px -12% 0px" });

    const prepare = (root: ParentNode = document) => {
      root.querySelectorAll<HTMLElement>(selector).forEach((element) => {
        if (element.dataset.revealed) return;
        element.dataset.revealed = "1";
        // Reduced motion is handled in CSS (fades only). Never animate the dashboard or dialogs: a transform on an ancestor turns every
        // position:fixed child (modal backdrops, the article editor) into a box-local layer.
        if (element.closest(".admin-shell, [role='dialog'], [aria-modal='true']")) return;
        // Siblings revealed together enter one after another.
        const siblings = element.parentElement ? [...element.parentElement.children].filter((child) => child.matches(selector)) : [];
        const index = Math.max(0, siblings.indexOf(element));
        if (index) element.style.setProperty("--reveal-delay", `${(index % MAX_STAGGER) * STAGGER_MS}ms`);
        element.classList.add("scroll-ready");
        observer.observe(element);
      });
    };

    // When the intro finishes, re-check what is already on screen.
    const introObserver = new MutationObserver(() => {
      if (root.classList.contains("light-intro-active")) return;
      introObserver.disconnect();
      document.querySelectorAll<HTMLElement>(".scroll-ready:not(.is-scroll-visible)").forEach((element) => { observer.unobserve(element); observer.observe(element); });
    });
    if (root.classList.contains("light-intro-active")) introObserver.observe(root, { attributes: true, attributeFilter: ["class"] });

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
      introObserver.disconnect();
      observer.disconnect();
      timers.forEach((timer) => window.clearTimeout(timer));
      window.removeEventListener("scroll", onScroll);
      document.body.classList.remove("is-scrolling-down", "is-scrolling-up");
    };
  }, []);

  return null;
}

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
  ".lg-review",
  ".lg-rank",
  ".lg-night",
  ".archive-article-card",
];

const STAGGER_MS = 90;
const MAX_STAGGER = 4;
const REVEAL_MS = 1000;

export default function ScrollAnimations() {
  useEffect(() => {
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
        if (!entry.isIntersecting) return;
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

    prepare();
    const mutationObserver = new MutationObserver(() => prepare());
    mutationObserver.observe(document.body, { childList: true, subtree: true });

    // The compact header is much shorter than the full one. If the page lost that height, every block
    // below would jump up, the browser would pull the scroll back under the threshold and the header
    // would flicker between both states. While compact, the header keeps the lost height as margin.
    const headerSelector = ".site-header, .dynamic-article__header";
    const expandedHeights = new WeakMap<HTMLElement, number>();
    const syncHeaderSpace = () => {
      const compact = document.body.classList.contains("is-scrolling-down");
      document.querySelectorAll<HTMLElement>(headerSelector).forEach((header) => {
        if (!compact) { header.style.marginBottom = ""; expandedHeights.set(header, header.offsetHeight); return; }
        const expanded = expandedHeights.get(header);
        if (expanded) header.style.marginBottom = `${Math.max(0, expanded - header.offsetHeight)}px`;
      });
    };
    const headerResize = new ResizeObserver(syncHeaderSpace);
    const watchHeaders = () => document.querySelectorAll<HTMLElement>(headerSelector).forEach((header) => { if (!header.dataset.heightWatched) { header.dataset.heightWatched = "1"; headerResize.observe(header); } });
    watchHeaders();
    const headerObserver = new MutationObserver(watchHeaders);
    headerObserver.observe(document.body, { childList: true, subtree: true });

    let compactNav = window.scrollY > 180;
    let ticking = false;
    const updateScrollDirection = () => {
      const currentScrollY = window.scrollY;
      // The compact header is threshold-based, not gesture-based, so small
      // touchpad rebounds cannot make the navigation flash or get stuck.
      if (currentScrollY > 180) compactNav = true;
      if (currentScrollY < 80) compactNav = false;
      if (compactNav !== document.body.classList.contains("is-scrolling-down")) {
        if (compactNav) syncHeaderSpace(); // remember the full height before shrinking
        document.body.classList.toggle("is-scrolling-down", compactNav);
        syncHeaderSpace();
      }
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
      timers.forEach((timer) => window.clearTimeout(timer));
      window.removeEventListener("scroll", onScroll);
      headerResize.disconnect();
      headerObserver.disconnect();
      document.body.classList.remove("is-scrolling-down", "is-scrolling-up");
    };
  }, []);

  return null;
}

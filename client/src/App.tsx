import { Analytics } from "@vercel/analytics/react";
import { Toaster } from "@/components/ui/sonner";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { trackPageView } from "@/lib/analytics";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Redirect, Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import SiteSearch from "./components/SiteSearch";
import Home from "./pages/Home";
const ArticlePage = lazy(() => import("./pages/ArticlePage"));
const InfoPage = lazy(() => import("./pages/InfoPage"));
const SectionPage = lazy(() => import("./pages/SectionPage"));
const RunwayPage = lazy(() => import("./pages/RunwayPage"));
const BrandPage = lazy(() => import("./pages/BrandPage"));
import ScrollAnimations from "./components/ScrollAnimations";
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const DynamicArticlePage = lazy(() => import("./pages/DynamicArticlePage"));
const MagazineEditionPage = lazy(() => import("./pages/MagazineEditionPage"));
const ArchivePage = lazy(() => import("./pages/ArchivePage"));
const LivingPage = lazy(() => import("./pages/LivingPage"));
const MastheadPage = lazy(() => import("./pages/MastheadPage"));
const MastheadPersonPage = lazy(() => import("./pages/MastheadPersonPage"));
const BusinessPage = lazy(() => import("./pages/BusinessPage"));
const AboutPage = lazy(() => import("./pages/AboutPage"));
import ComingSoonGate from "./components/ComingSoonGate";

function PageViewTracker() {
  const [location] = useLocation();
  useEffect(() => {
    const targetId = window.location.hash.slice(1);
    if (targetId) {
      // Pages load lazily, so the anchor may not exist yet: retry for ~2s.
      let frame = 0;
      let attempts = 0;
      const scrollToTarget = () => {
        const target = document.getElementById(targetId);
        if (target) target.scrollIntoView({ block: "start", behavior: "auto" });
        else if (attempts++ < 120) frame = window.requestAnimationFrame(scrollToTarget);
      };
      frame = window.requestAnimationFrame(scrollToTarget);
      void trackPageView(location);
      return () => window.cancelAnimationFrame(frame);
    }
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    void trackPageView(location);
  }, [location]);
  return null;
}

/** Fades each new page in (opacity only: a transform here would break fixed menus and dialogs) and draws a hairline progress bar. */
function PageTransition({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const first = useRef(true);
  const [navigations, setNavigations] = useState(0);
  useEffect(() => { if (first.current) { first.current = false; return; } document.documentElement.classList.add("has-navigated"); setNavigations((count) => count + 1); }, [location]);
  return <>{navigations > 0 && <div className="route-progress" key={navigations} aria-hidden="true" />}<div className="page-transition" key={location}>{children}</div></>;
}

function GlobalSearchLayer() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const openSearch = () => setOpen(true);
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA";
      if ((!typing && event.key === "/") || ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k")) {
        event.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("light:open-search", openSearch);
    window.addEventListener("keydown", onKeyDown);
    return () => { window.removeEventListener("light:open-search", openSearch); window.removeEventListener("keydown", onKeyDown); };
  }, []);
  return open ? <SiteSearch onClose={() => setOpen(false)} /> : null;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/moda" component={() => <ComingSoonGate path="/moda"><SectionPage section="moda" /></ComingSoonGate>} />
      <Route path="/belleza" component={() => <ComingSoonGate path="/belleza"><SectionPage section="belleza" /></ComingSoonGate>} />
      <Route path="/eventos" component={() => <ComingSoonGate path="/eventos"><SectionPage section="eventos" /></ComingSoonGate>} />
      <Route path="/cultura" component={() => <Redirect to="/eventos" />} />
      <Route path="/sociedad" component={() => <SectionPage section="sociedad" />} />
      <Route path="/living" component={() => <ComingSoonGate path="/living"><LivingPage /></ComingSoonGate>} />
      <Route path="/masthead" component={MastheadPage} />
      <Route path="/masthead/:slug" component={MastheadPersonPage} />
      <Route path="/business" component={BusinessPage} />
      <Route path="/about" component={AboutPage} />
      <Route path="/runway" component={() => <ComingSoonGate path="/runway"><RunwayPage /></ComingSoonGate>} />
      <Route path="/runway/:brand" component={BrandPage} />
      <Route path="/revista/:number" component={MagazineEditionPage} />
      <Route path="/archivo" component={() => <ComingSoonGate path="/archivo"><ArchivePage /></ComingSoonGate>} />
      <Route path="/newsletter" component={() => <ComingSoonGate path="/newsletter"><InfoPage kind="newsletter" /></ComingSoonGate>} />
      <Route path="/sobre-moda" component={() => <ComingSoonGate path="/sobre-moda"><InfoPage kind="sobre-moda" /></ComingSoonGate>} />
      <Route path="/contacto" component={() => <Redirect to="/business#colaboraciones" />} />
      <Route path="/privacidad" component={() => <InfoPage kind="privacidad" />} />
      <Route path="/terminos" component={() => <InfoPage kind="terminos" />} />
      <Route path="/cookies" component={() => <InfoPage kind="cookies" />} />
      <Route path="/historias/vestirse-de-futuro" component={ArticlePage} />
      <Route path="/historias/:slug" component={DynamicArticlePage} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="light" switchable><TooltipProvider><Analytics mode="production" /><Toaster /><PageViewTracker /><GlobalSearchLayer /><ScrollAnimations /><PageTransition><Suspense fallback={<div className="min-h-screen" aria-busy="true" />}><Router /></Suspense></PageTransition></TooltipProvider></ThemeProvider></ErrorBoundary>;
}

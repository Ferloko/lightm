import { Analytics } from "@vercel/analytics/react";
import { Toaster } from "@/components/ui/sonner";
import { useEffect, useState } from "react";
import { trackPageView } from "@/lib/analytics";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import SiteSearch from "./components/SiteSearch";
import Home from "./pages/Home";
import ArticlePage from "./pages/ArticlePage";
import InfoPage from "./pages/InfoPage";
import SectionPage from "./pages/SectionPage";
import RunwayPage from "./pages/RunwayPage";
import BrandPage from "./pages/BrandPage";
import ScrollAnimations from "./components/ScrollAnimations";
import AdminDashboard from "./pages/AdminDashboard";
import DynamicArticlePage from "./pages/DynamicArticlePage";
import MagazineEditionPage from "./pages/MagazineEditionPage";
import ArchivePage from "./pages/ArchivePage";
<<<<<<< HEAD
=======
import LivingPage from "./pages/LivingPage";
import ComingSoonGate from "./components/ComingSoonGate";
>>>>>>> 262872a606f138ec3ba64c08b614496d59e84fc6

function PageViewTracker() {
  const [location] = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    void trackPageView(location);
  }, [location]);
  return null;
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
      <Route path="/cultura" component={() => <ComingSoonGate path="/cultura"><SectionPage section="cultura" /></ComingSoonGate>} />
      <Route path="/sociedad" component={() => <SectionPage section="sociedad" />} />
      <Route path="/living" component={() => <ComingSoonGate path="/living"><LivingPage /></ComingSoonGate>} />
      <Route path="/runway" component={() => <ComingSoonGate path="/runway"><RunwayPage /></ComingSoonGate>} />
      <Route path="/runway/:brand" component={BrandPage} />
      <Route path="/revista/:number" component={MagazineEditionPage} />
<<<<<<< HEAD
      <Route path="/archivo" component={ArchivePage} />
      <Route path="/newsletter" component={() => <InfoPage kind="newsletter" />} />
      <Route path="/sobre-moda" component={() => <InfoPage kind="sobre-moda" />} />
      <Route path="/contacto" component={() => <InfoPage kind="contacto" />} />
=======
      <Route path="/archivo" component={() => <ComingSoonGate path="/archivo"><ArchivePage /></ComingSoonGate>} />
      <Route path="/newsletter" component={() => <ComingSoonGate path="/newsletter"><InfoPage kind="newsletter" /></ComingSoonGate>} />
      <Route path="/sobre-moda" component={() => <ComingSoonGate path="/sobre-moda"><InfoPage kind="sobre-moda" /></ComingSoonGate>} />
      <Route path="/contacto" component={() => <ComingSoonGate path="/contacto"><InfoPage kind="contacto" /></ComingSoonGate>} />
>>>>>>> 262872a606f138ec3ba64c08b614496d59e84fc6
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
  return <ErrorBoundary><ThemeProvider defaultTheme="light" switchable><TooltipProvider><Analytics mode="production" /><Toaster /><PageViewTracker /><GlobalSearchLayer /><ScrollAnimations /><Router /></TooltipProvider></ThemeProvider></ErrorBoundary>;
}

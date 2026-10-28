import { Analytics } from "@vercel/analytics/react";
import { Toaster } from "@/components/ui/sonner";
import { useEffect } from "react";
import { trackPageView } from "@/lib/analytics";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import ArticlePage from "./pages/ArticlePage";
import InfoPage from "./pages/InfoPage";
import SectionPage from "./pages/SectionPage";
import RunwayPage from "./pages/RunwayPage";
import BrandPage from "./pages/BrandPage";
import ScrollAnimations from "./components/ScrollAnimations";
import AdminDashboard from "./pages/AdminDashboard";
import DynamicArticlePage from "./pages/DynamicArticlePage";

function PageViewTracker() {
  const [location] = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    void trackPageView(location);
  }, [location]);
  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/moda" component={() => <SectionPage section="moda" />} />
      <Route path="/belleza" component={() => <SectionPage section="belleza" />} />
      <Route path="/cultura" component={() => <SectionPage section="cultura" />} />
      <Route path="/sociedad" component={() => <SectionPage section="sociedad" />} />
      <Route path="/runway" component={RunwayPage} />
      <Route path="/runway/:brand" component={BrandPage} />
      <Route path="/archivo" component={() => <InfoPage kind="archivo" />} />
      <Route path="/newsletter" component={() => <InfoPage kind="newsletter" />} />
      <Route path="/sobre-moda" component={() => <InfoPage kind="sobre-moda" />} />
      <Route path="/contacto" component={() => <InfoPage kind="contacto" />} />
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
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Analytics mode="production" />
          <Toaster />
          <PageViewTracker />
          <ScrollAnimations />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

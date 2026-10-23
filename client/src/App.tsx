import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import ArticlePage from "./pages/ArticlePage";
import InfoPage from "./pages/InfoPage";
import SectionPage from "./pages/SectionPage";
import RunwayPage from "./pages/RunwayPage";
import BrandPage from "./pages/BrandPage";
import ScrollAnimations from "./components/ScrollAnimations";

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
      <Route path="/historias/vestirse-de-futuro" component={ArticlePage} />
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
          <Toaster />
          <ScrollAnimations />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

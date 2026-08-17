import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { TurnAlerts } from "./game/online/TurnAlerts";
import Home from "./pages/Home";
import ModelLab from "./pages/ModelLab";
import PlaytestLab from "./pages/PlaytestLab";
import Privacy from "./pages/Privacy";
import Store from "./pages/Store";
import Story from "./pages/Story";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/store"} component={Store} />
      <Route path={"/story"} component={Story} />
      {/* Required by App Store Guideline 5.1.1(i); also the URL that goes in
          the App Store Connect listing's Privacy Policy field. */}
      <Route path={"/privacy"} component={Privacy} />
      <Route path={"/playtest-lab"} component={PlaytestLab} />
      <Route path={"/model-lab"} component={ModelLab} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="dark"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <TurnAlerts />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

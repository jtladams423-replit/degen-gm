import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SportProvider } from "@/lib/sportContext";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import MockDraft from "@/pages/MockDraft";
import History from "@/pages/History";
import Teams from "@/pages/Teams";
import Combine from "@/pages/Combine";
import TeamBuilder from "@/pages/TeamBuilder";
import TradeMachine from "@/pages/TradeMachine";
import Compare from "@/pages/Compare";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/team-builder" component={TeamBuilder} />
      <Route path="/trade-machine" component={TradeMachine} />
      <Route path="/mock-draft" component={MockDraft} />
      <Route path="/mock-draft/:code" component={MockDraft} />
      <Route path="/teams" component={Teams} />
      <Route path="/combine" component={Combine} />
      <Route path="/compare" component={Compare} />
      <Route path="/history" component={History} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SportProvider>
        <TooltipProvider>
          <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-blue-600 focus:text-white focus:px-4 focus:py-2 focus:rounded">
            Skip to main content
          </a>
          <Toaster />
          <main id="main-content" role="main">
            <Router />
          </main>
        </TooltipProvider>
      </SportProvider>
    </QueryClientProvider>
  );
}

export default App;

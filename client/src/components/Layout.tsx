import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Users, 
  History, 
  Menu,
  X,
  ShieldHalf,
  Timer,
  Hammer,
  ArrowRightLeft,
  GitCompareArrows,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useSport, type Sport } from "@/lib/sportContext";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { sport, setSport } = useSport();

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/" },
    { icon: Hammer, label: "Team Builder", href: "/team-builder" },
    { icon: ArrowRightLeft, label: "Trade Machine", href: "/trade-machine" },
    { icon: Users, label: "Mock Draft", href: "/mock-draft" },
    { icon: ShieldHalf, label: "Teams & FA", href: "/teams" },
    { icon: Timer, label: "Combine", href: "/combine" },
    { icon: GitCompareArrows, label: "Compare", href: "/compare" },
    { icon: History, label: "History", href: "/history" },
  ];

  const draftInfo = sport === "NFL"
    ? "2026 NFL Draft \u2022 April 24-26, Pittsburgh"
    : "2025 NBA Draft \u2022 June 25-26, Brooklyn";

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside 
        className={cn(
          "fixed top-0 left-0 z-50 h-screen w-64 bg-card border-r border-border transition-transform duration-300 md:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="h-16 flex items-center px-6 border-b border-border">
          <h1 className="text-2xl font-display font-bold tracking-wider text-primary">
            DEGEN<span className="text-foreground">GM</span>
          </h1>
          <Button 
            variant="ghost" 
            size="icon" 
            className="ml-auto md:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="px-4 pt-4">
          <div className="flex gap-1 p-1 bg-muted rounded-lg">
            <button
              onClick={() => setSport("NFL")}
              className={cn(
                "flex-1 py-2 px-3 rounded-md text-sm font-bold transition-all",
                sport === "NFL"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
              data-testid="sport-toggle-nfl"
            >
              NFL
            </button>
            <button
              onClick={() => setSport("NBA")}
              className={cn(
                "flex-1 py-2 px-3 rounded-md text-sm font-bold transition-all",
                sport === "NBA"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
              data-testid="sport-toggle-nba"
            >
              NBA
            </button>
          </div>
        </div>

        <nav className="p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            
            return (
              <Link key={item.href} href={item.href} className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-md transition-all duration-200 group cursor-pointer",
                  isActive 
                    ? "bg-primary/10 text-primary border-r-2 border-primary" 
                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                )}>
                  <Icon className={cn(
                    "h-5 w-5",
                    isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                  )} />
                  <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

      </aside>

      <main className="flex-1 md:ml-64 min-h-screen flex flex-col">
        <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-30 px-6 flex items-center justify-between md:justify-end">
          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden sm:inline-block">
              {draftInfo}
            </span>
            <div className="h-4 w-px bg-border hidden sm:block" />
            <span className="text-sm font-display font-bold text-primary">
              v2.4.0 BETA
            </span>
          </div>
        </header>

        <div className="p-3 sm:p-6 md:p-8 flex-1 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

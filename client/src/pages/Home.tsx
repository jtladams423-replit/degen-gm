import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { ArrowRight, Play, TrendingUp, History as HistoryIcon, FileJson } from "lucide-react";
import { motion } from "framer-motion";
import { useSport } from "@/lib/sportContext";

export default function Home() {
  const { sport } = useSport();
  const draftYear = sport === "NFL" ? "2026" : "2025";
  return (
    <Layout>
      <div className="space-y-8">
        {/* Hero Section */}
        <div className="relative rounded-xl overflow-hidden min-h-[280px] sm:min-h-[400px] flex items-center border border-border group">
          <div className="absolute inset-0 z-0">
            <img 
              src="/hero-bg.png" 
              alt="Background" 
              className="w-full h-full object-cover opacity-40 group-hover:opacity-50 transition-opacity duration-700" 
            />
            <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent" />
          </div>
          
          <div className="relative z-10 p-8 md:p-12 max-w-2xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-sm font-medium mb-6">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
                {draftYear} {sport} Draft Class Loaded
              </div>
              
              <h1 className="text-3xl sm:text-5xl md:text-6xl font-display font-bold leading-tight mb-4 sm:mb-6">
                BUILD THE <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/60">DYNASTY</span>
              </h1>
              
              <p className="text-sm sm:text-lg text-muted-foreground mb-6 sm:mb-8 leading-relaxed max-w-lg">
                The most advanced {sport} mock draft simulator. Analyze historical trends, identify value picks, and simulate thousands of scenarios with our AI-driven engine.
              </p>
              
              <div className="flex flex-wrap gap-4">
                <Link href="/mock-draft">
                  <Button size="lg" className="h-12 px-8 text-base gap-2 shadow-[0_0_20px_hsl(var(--primary)/0.5)] hover:shadow-[0_0_30px_hsl(var(--primary)/0.6)] transition-shadow">
                    <Play className="h-5 w-5 fill-current" />
                    Start Mock Draft
                  </Button>
                </Link>
                <Link href="/team-builder">
                  <Button size="lg" variant="outline" className="h-12 px-8 text-base gap-2 bg-background/50 backdrop-blur-sm">
                    <TrendingUp className="h-5 w-5" />
                    Team Builder
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-card/50 border-border/50 hover:border-primary/50 transition-colors group cursor-pointer">
            <CardHeader>
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-2 group-hover:scale-110 transition-transform">
                <Users className="h-5 w-5" />
              </div>
              <CardTitle>Interactive Mocks</CardTitle>
              <CardDescription>
                Control every pick or let the AI simulate based on team needs and value boards.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/mock-draft">
                <Button variant="link" className="px-0 text-primary group-hover:translate-x-1 transition-transform">
                  Start Drafting <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border/50 hover:border-primary/50 transition-colors group cursor-pointer">
            <CardHeader>
              <div className="h-10 w-10 rounded-lg bg-chart-2/10 flex items-center justify-center text-chart-2 mb-2 group-hover:scale-110 transition-transform">
                <BarChart3 className="h-5 w-5" />
              </div>
              <CardTitle>Team Builder</CardTitle>
              <CardDescription>
                Sign free agents, manage cap space, and update team needs before running your mock draft.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/team-builder">
                <Button variant="link" className="px-0 text-chart-2 group-hover:translate-x-1 transition-transform">
                  Build Roster <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border/50 hover:border-primary/50 transition-colors group cursor-pointer">
            <CardHeader>
              <div className="h-10 w-10 rounded-lg bg-chart-3/10 flex items-center justify-center text-chart-3 mb-2 group-hover:scale-110 transition-transform">
                <FileJson className="h-5 w-5" />
              </div>
              <CardTitle>Import & Export</CardTitle>
              <CardDescription>
                Bring your own data. Import previous mocks or export your results to JSON/CSV.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/history">
                <Button variant="link" className="px-0 text-chart-3 group-hover:translate-x-1 transition-transform">
                  Manage Data <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}

import { Users, BarChart3 } from "lucide-react";

import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import type { Prospect } from "@shared/schema";
import { Search, Trophy, Timer, Dumbbell, ArrowUpToLine, Ruler } from "lucide-react";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useSport } from "@/lib/sportContext";

export default function Combine() {
  const { sport, positions: sportPositions, combineMetrics } = useSport();
  const { data: players, isLoading } = useQuery<Prospect[]>({ queryKey: [`/api/prospects?sport=${sport}`] });
  const [searchQuery, setSearchQuery] = useState("");
  const [positionFilter, setPositionFilter] = useState("ALL");

  const filteredPlayers = useMemo(() => {
    if (!players) return [];
    return players.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            p.college.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPos = positionFilter === "ALL" || p.position === positionFilter;
      return matchesSearch && matchesPos;
    });
  }, [players, searchQuery, positionFilter]);

  const stats = useMemo(() => {
    if (!players || players.length === 0) return null;

    if (sport === "NFL") {
      const withForty = players.filter(p => p.fortyTime != null);
      const fastest40 = withForty.length > 0 ? withForty.reduce((best, p) => (p.fortyTime! < best.fortyTime! ? p : best)) : null;
      const withBench = players.filter(p => p.benchReps != null);
      const topBench = withBench.length > 0 ? withBench.reduce((best, p) => (p.benchReps! > best.benchReps! ? p : best)) : null;
      const withVert = players.filter(p => p.vertical != null);
      const highestVert = withVert.length > 0 ? withVert.reduce((best, p) => (p.vertical! > best.vertical! ? p : best)) : null;
      const parseHeight = (h: string) => {
        const match = h.match(/(\d+)'(\d+)"/);
        if (!match) return 0;
        return parseInt(match[1]) * 12 + parseInt(match[2]);
      };
      const tallest = players.reduce((best, p) => (parseHeight(p.height) > parseHeight(best.height) ? p : best));
      return { fastest40, topBench, highestVert, tallest };
    } else {
      const withVert = players.filter(p => p.vertical != null);
      const highestVert = withVert.length > 0 ? withVert.reduce((best, p) => (p.vertical! > best.vertical! ? p : best)) : null;
      const withSprint = players.filter(p => p.sprint != null);
      const fastestSprint = withSprint.length > 0 ? withSprint.reduce((best, p) => (p.sprint! < best.sprint! ? p : best)) : null;
      const withAgility = players.filter(p => p.laneAgility != null);
      const bestAgility = withAgility.length > 0 ? withAgility.reduce((best, p) => (p.laneAgility! < best.laneAgility! ? p : best)) : null;
      const longestWingspan = players.filter(p => p.wingspan != null).length > 0
        ? players.filter(p => p.wingspan != null).reduce((best, p) => {
            const bw = best.wingspan || "";
            const pw = p.wingspan || "";
            return pw > bw ? p : best;
          })
        : null;
      return { highestVert, fastestSprint, bestAgility, longestWingspan };
    }
  }, [players, sport]);

  const getPerformanceColor = (value: number | undefined | null, type: 'speed' | 'strength' | 'jump') => {
    if (!value) return "text-muted-foreground";
    if (type === 'speed') {
      if (value < 4.4) return "text-emerald-500 font-bold";
      if (value < 4.5) return "text-emerald-400";
    }
    if (type === 'strength') {
      if (value > 25) return "text-emerald-500 font-bold";
      if (value > 20) return "text-emerald-400";
    }
    if (type === 'jump') {
      if (value > 35) return "text-emerald-500 font-bold";
      if (value > 32) return "text-emerald-400";
    }
    return "text-foreground";
  };

  const allPositions = ["ALL", ...sportPositions];

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-muted-foreground">Loading combine data...</div>
        </div>
      </Layout>
    );
  }

  const nflStats = sport === "NFL" ? stats as { fastest40: Prospect | null; topBench: Prospect | null; highestVert: Prospect | null; tallest: Prospect } | null : null;
  const nbaStats = sport === "NBA" ? stats as { highestVert: Prospect | null; fastestSprint: Prospect | null; bestAgility: Prospect | null; longestWingspan: Prospect | null } | null : null;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-foreground" data-testid="text-combine-title">{sport} Combine</h2>
            <p className="text-muted-foreground">
              {sport === "NFL" 
                ? "Official measurements and testing results from Indianapolis."
                : "Official draft combine measurements and athletic testing."}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {sport === "NFL" ? (
            <>
              <Card className="bg-primary/5 border-primary/20">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Timer className="h-4 w-4" /> Fastest 40
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="text-2xl font-bold text-primary">{nflStats?.fastest40 ? `${nflStats.fastest40.fortyTime!.toFixed(2)}s` : '-'}</div>
                  <p className="text-xs text-muted-foreground">{nflStats?.fastest40 ? `${nflStats.fastest40.name} (${nflStats.fastest40.position})` : '-'}</p>
                </CardContent>
              </Card>
              <Card className="bg-primary/5 border-primary/20">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Dumbbell className="h-4 w-4" /> Top Bench
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="text-2xl font-bold text-primary">{nflStats?.topBench ? `${nflStats.topBench.benchReps} Reps` : '-'}</div>
                  <p className="text-xs text-muted-foreground">{nflStats?.topBench ? `${nflStats.topBench.name} (${nflStats.topBench.position})` : '-'}</p>
                </CardContent>
              </Card>
              <Card className="bg-primary/5 border-primary/20">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <ArrowUpToLine className="h-4 w-4" /> Highest Vert
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="text-2xl font-bold text-primary">{nflStats?.highestVert ? `${nflStats.highestVert.vertical}"` : '-'}</div>
                  <p className="text-xs text-muted-foreground">{nflStats?.highestVert ? `${nflStats.highestVert.name} (${nflStats.highestVert.position})` : '-'}</p>
                </CardContent>
              </Card>
              <Card className="bg-primary/5 border-primary/20">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Ruler className="h-4 w-4" /> Tallest
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="text-2xl font-bold text-primary">{nflStats?.tallest ? nflStats.tallest.height : '-'}</div>
                  <p className="text-xs text-muted-foreground">{nflStats?.tallest ? `${nflStats.tallest.name} (${nflStats.tallest.position})` : '-'}</p>
                </CardContent>
              </Card>
            </>
          ) : (
            <>
              <Card className="bg-primary/5 border-primary/20">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <ArrowUpToLine className="h-4 w-4" /> Highest Vert
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="text-2xl font-bold text-primary">{nbaStats?.highestVert ? `${nbaStats.highestVert.vertical}"` : '-'}</div>
                  <p className="text-xs text-muted-foreground">{nbaStats?.highestVert ? `${nbaStats.highestVert.name} (${nbaStats.highestVert.position})` : '-'}</p>
                </CardContent>
              </Card>
              <Card className="bg-primary/5 border-primary/20">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Timer className="h-4 w-4" /> Fastest Sprint
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="text-2xl font-bold text-primary">{nbaStats?.fastestSprint ? `${nbaStats.fastestSprint.sprint!.toFixed(1)}s` : '-'}</div>
                  <p className="text-xs text-muted-foreground">{nbaStats?.fastestSprint ? `${nbaStats.fastestSprint.name} (${nbaStats.fastestSprint.position})` : '-'}</p>
                </CardContent>
              </Card>
              <Card className="bg-primary/5 border-primary/20">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Trophy className="h-4 w-4" /> Best Agility
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="text-2xl font-bold text-primary">{nbaStats?.bestAgility ? `${nbaStats.bestAgility.laneAgility!.toFixed(1)}s` : '-'}</div>
                  <p className="text-xs text-muted-foreground">{nbaStats?.bestAgility ? `${nbaStats.bestAgility.name} (${nbaStats.bestAgility.position})` : '-'}</p>
                </CardContent>
              </Card>
              <Card className="bg-primary/5 border-primary/20">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Ruler className="h-4 w-4" /> Longest Wingspan
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="text-2xl font-bold text-primary">{nbaStats?.longestWingspan ? nbaStats.longestWingspan.wingspan : '-'}</div>
                  <p className="text-xs text-muted-foreground">{nbaStats?.longestWingspan ? `${nbaStats.longestWingspan.name} (${nbaStats.longestWingspan.position})` : '-'}</p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row gap-4 justify-between">
              <div>
                 <CardTitle>Participant Results</CardTitle>
                 <CardDescription>Filter by position or search by name/school.</CardDescription>
              </div>
              <div className="flex gap-2">
                <div className="relative w-full md:w-64">
                   <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                   <Input 
                     placeholder="Search..." 
                     className="pl-8" 
                     value={searchQuery}
                     onChange={(e) => setSearchQuery(e.target.value)}
                     data-testid="input-combine-search"
                   />
                </div>
              </div>
            </div>
            
            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar mt-4">
              {allPositions.map(pos => (
                <Button 
                  key={pos}
                  variant={positionFilter === pos ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPositionFilter(pos)}
                  className="rounded-full"
                  data-testid={`button-pos-${pos.toLowerCase()}`}
                >
                  {pos}
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="px-0 sm:px-6">
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-card z-10">Player</TableHead>
                  <TableHead>Pos</TableHead>
                  <TableHead className="hidden sm:table-cell">Ht / Wt</TableHead>
                  {sport === "NFL" ? (
                    <>
                      <TableHead>40-Yd</TableHead>
                      <TableHead>Vert</TableHead>
                      <TableHead className="hidden md:table-cell">Bench</TableHead>
                      <TableHead className="hidden lg:table-cell">Broad</TableHead>
                      <TableHead className="hidden lg:table-cell">Shuttle</TableHead>
                      <TableHead className="hidden lg:table-cell">3-Cone</TableHead>
                    </>
                  ) : (
                    <>
                      <TableHead>Wingspan</TableHead>
                      <TableHead className="hidden md:table-cell">Reach</TableHead>
                      <TableHead>Vert</TableHead>
                      <TableHead className="hidden lg:table-cell">Agility</TableHead>
                      <TableHead className="hidden lg:table-cell">Sprint</TableHead>
                      <TableHead className="hidden lg:table-cell">Shuttle</TableHead>
                    </>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPlayers.map((player) => (
                  <TableRow key={player.id} data-testid={`row-prospect-${player.id}`}>
                    <TableCell className="sticky left-0 bg-card z-10">
                      <div className="font-medium">{player.name}</div>
                      <div className="text-xs text-muted-foreground">{player.college}</div>
                      <div className="text-xs text-muted-foreground sm:hidden">{player.height} / {player.weight}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{player.position}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs hidden sm:table-cell">
                      {player.height} / {player.weight}
                    </TableCell>
                    {sport === "NFL" ? (
                      <>
                        <TableCell className={cn("font-mono font-medium", getPerformanceColor(player.fortyTime, 'speed'))}>
                          {player.fortyTime?.toFixed(2) || '-'}
                        </TableCell>
                        <TableCell className={cn("font-mono font-medium", getPerformanceColor(player.vertical, 'jump'))}>
                          {player.vertical ? `${player.vertical}"` : '-'}
                        </TableCell>
                        <TableCell className={cn("font-mono font-medium hidden md:table-cell", getPerformanceColor(player.benchReps, 'strength'))}>
                          {player.benchReps || '-'}
                        </TableCell>
                        <TableCell className="font-mono text-muted-foreground hidden lg:table-cell">
                          {player.broadJump || '-'}
                        </TableCell>
                        <TableCell className="font-mono text-muted-foreground hidden lg:table-cell">
                          {player.shuttle?.toFixed(2) || '-'}
                        </TableCell>
                        <TableCell className="font-mono text-muted-foreground hidden lg:table-cell">
                          {player.threeCone?.toFixed(2) || '-'}
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell className="font-mono text-foreground">
                          {player.wingspan || '-'}
                        </TableCell>
                        <TableCell className="font-mono text-foreground hidden md:table-cell">
                          {player.standingReach || '-'}
                        </TableCell>
                        <TableCell className={cn("font-mono font-medium", getPerformanceColor(player.vertical, 'jump'))}>
                          {player.vertical ? `${player.vertical}"` : '-'}
                        </TableCell>
                        <TableCell className="font-mono text-muted-foreground hidden lg:table-cell">
                          {player.laneAgility?.toFixed(1) || '-'}
                        </TableCell>
                        <TableCell className="font-mono text-muted-foreground hidden lg:table-cell">
                          {player.sprint?.toFixed(1) || '-'}
                        </TableCell>
                        <TableCell className="font-mono text-muted-foreground hidden lg:table-cell">
                          {player.shuttle?.toFixed(2) || '-'}
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

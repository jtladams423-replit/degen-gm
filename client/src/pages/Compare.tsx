import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery } from "@tanstack/react-query";
import type { Prospect, PlayerSeasonStats, CollegeStats } from "@shared/schema";
import { Search, X, Plus, ArrowUpDown, Trophy, TrendingUp, Zap, Activity, RefreshCw, GraduationCap } from "lucide-react";
import { useState, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useSport } from "@/lib/sportContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend
} from "recharts";

const PLAYER_COLORS = [
  "hsl(var(--primary))",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
];

const PLAYER_BG_COLORS = [
  "hsl(var(--primary) / 0.15)",
  "rgba(245, 158, 11, 0.15)",
  "rgba(239, 68, 68, 0.15)",
  "rgba(139, 92, 246, 0.15)",
];

interface MetricDef {
  key: string;
  label: string;
  unit: string;
  higherBetter: boolean;
  extract: (p: Prospect) => number | null;
}

function getNFLMetrics(): MetricDef[] {
  return [
    { key: "grade", label: "Draft Grade", unit: "", higherBetter: true, extract: (p) => p.grade },
    { key: "fortyTime", label: "40-Yard Dash", unit: "s", higherBetter: false, extract: (p) => p.fortyTime },
    { key: "vertical", label: "Vertical Jump", unit: "\"", higherBetter: true, extract: (p) => p.vertical },
    { key: "benchReps", label: "Bench Press", unit: " reps", higherBetter: true, extract: (p) => p.benchReps },
    { key: "shuttle", label: "20-Yd Shuttle", unit: "s", higherBetter: false, extract: (p) => p.shuttle },
    { key: "threeCone", label: "3-Cone Drill", unit: "s", higherBetter: false, extract: (p) => p.threeCone },
  ];
}

function getNBAMetrics(): MetricDef[] {
  return [
    { key: "grade", label: "Draft Grade", unit: "", higherBetter: true, extract: (p) => p.grade },
    { key: "vertical", label: "Max Vertical", unit: "\"", higherBetter: true, extract: (p) => p.vertical },
    { key: "laneAgility", label: "Lane Agility", unit: "s", higherBetter: false, extract: (p) => p.laneAgility },
    { key: "sprint", label: "3/4 Court Sprint", unit: "s", higherBetter: false, extract: (p) => p.sprint },
    { key: "shuttle", label: "Shuttle Run", unit: "s", higherBetter: false, extract: (p) => p.shuttle },
  ];
}

function computePercentile(value: number, allValues: number[], higherBetter: boolean): number {
  const sorted = [...allValues].sort((a, b) => a - b);
  const rank = sorted.filter(v => (higherBetter ? v <= value : v >= value)).length;
  return Math.round((rank / sorted.length) * 100);
}

function PlayerSelector({
  players,
  onSelect,
  excludeIds,
  searchQuery,
  setSearchQuery,
  positionFilter,
  setPositionFilter,
  sportPositions,
}: {
  players: Prospect[];
  onSelect: (p: Prospect) => void;
  excludeIds: Set<number>;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  positionFilter: string;
  setPositionFilter: (p: string) => void;
  sportPositions: string[];
}) {
  const filtered = useMemo(() => {
    return players.filter(p => {
      if (excludeIds.has(p.id)) return false;
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.college.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPos = positionFilter === "ALL" || p.position === positionFilter;
      return matchesSearch && matchesPos;
    });
  }, [players, excludeIds, searchQuery, positionFilter]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search prospects..."
          className="pl-8"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          data-testid="input-compare-search"
        />
      </div>
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
        {["ALL", ...sportPositions].map(pos => (
          <Button
            key={pos}
            variant={positionFilter === pos ? "default" : "outline"}
            size="sm"
            onClick={() => setPositionFilter(pos)}
            className="rounded-full text-xs px-2.5 h-7"
            data-testid={`button-compare-pos-${pos.toLowerCase()}`}
          >
            {pos}
          </Button>
        ))}
      </div>
      <ScrollArea className="h-[400px]">
        <div className="space-y-1">
          {filtered.map(player => (
            <button
              key={player.id}
              onClick={() => onSelect(player)}
              className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors text-left"
              data-testid={`button-select-player-${player.id}`}
            >
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                {player.grade}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{player.name}</div>
                <div className="text-xs text-muted-foreground">{player.position} • {player.college}</div>
              </div>
              <Badge variant="secondary" className="text-xs">R{player.projectedRound}</Badge>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="text-center text-muted-foreground text-sm py-8">No prospects found</div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function normalizeForMatch(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z\s]/g, "")
    .toLowerCase()
    .trim();
}

function NBASeasonStatsSection({
  selected,
  nbaStats,
}: {
  selected: Prospect[];
  nbaStats: PlayerSeasonStats[];
}) {
  const matchedStats = useMemo(() => {
    const result: Record<number, PlayerSeasonStats | null> = {};
    for (const p of selected) {
      const normalized = normalizeForMatch(p.name);
      const match = nbaStats.find(s => normalizeForMatch(s.name) === normalized);
      result[p.id] = match || null;
    }
    return result;
  }, [selected, nbaStats]);

  const hasAnyMatch = Object.values(matchedStats).some(v => v !== null);
  if (!hasAnyMatch) return null;

  const statCols: { key: keyof PlayerSeasonStats; label: string; fmt?: (v: any) => string }[] = [
    { key: "pointsPerGame", label: "PPG" },
    { key: "reboundsPerGame", label: "RPG" },
    { key: "assistsPerGame", label: "APG" },
    { key: "stealsPerGame", label: "SPG" },
    { key: "blocksPerGame", label: "BPG" },
    { key: "fgPct", label: "FG%", fmt: (v: number) => `${(v * 100).toFixed(1)}%` },
    { key: "fg3Pct", label: "3P%", fmt: (v: number) => `${(v * 100).toFixed(1)}%` },
    { key: "ftPct", label: "FT%", fmt: (v: number) => `${(v * 100).toFixed(1)}%` },
    { key: "minutesPerGame", label: "MPG" },
    { key: "turnoversPerGame", label: "TOV" },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Activity className="h-5 w-5 text-emerald-500" />
          Live NBA Season Stats
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Current 2025-26 season averages from Basketball Reference
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" role="table">
            <thead>
              <tr className="border-b border-border">
                <th scope="col" className="text-left py-2 px-2 text-xs text-muted-foreground font-medium">Player</th>
                <th scope="col" className="text-left py-2 px-2 text-xs text-muted-foreground font-medium">Team</th>
                {statCols.map(col => (
                  <th scope="col" key={col.key} className="text-right py-2 px-2 text-xs text-muted-foreground font-medium whitespace-nowrap">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {selected.map((player, idx) => {
                const stats = matchedStats[player.id];
                return (
                  <tr key={player.id} className="border-b border-border/50 last:border-0">
                    <td className="py-2.5 px-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ background: PLAYER_COLORS[idx] }}
                        />
                        <span className="font-medium text-sm truncate max-w-[120px]" data-testid={`nba-stat-name-${player.id}`}>
                          {player.name}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-2 text-xs text-muted-foreground">
                      {stats ? stats.teamCode : "—"}
                    </td>
                    {statCols.map(col => {
                      const val = stats ? (stats as any)[col.key] : null;
                      return (
                        <td
                          key={col.key}
                          className="py-2.5 px-2 text-right font-mono text-xs"
                          data-testid={`nba-stat-${col.key}-${player.id}`}
                        >
                          {val != null
                            ? (col.fmt ? col.fmt(val) : Number(val).toFixed(1))
                            : "—"}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {Object.values(matchedStats).some(v => v === null) && (
          <p className="text-[10px] text-muted-foreground mt-2 italic">
            Stats shown only for players with matching NBA records. Draft prospects without NBA experience show dashes.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function CollegeStatsSection({
  selected,
  collegeStats,
}: {
  selected: Prospect[];
  collegeStats: CollegeStats[];
}) {
  const matchedStats = useMemo(() => {
    const result: Record<number, CollegeStats | null> = {};
    for (const p of selected) {
      const normalized = normalizeForMatch(p.name);
      const match = collegeStats.find(s =>
        normalizeForMatch(s.playerName) === normalized &&
        normalizeForMatch(s.college) === normalizeForMatch(p.college)
      );
      result[p.id] = match || null;
    }
    return result;
  }, [selected, collegeStats]);

  const hasAnyMatch = Object.values(matchedStats).some(v => v !== null);
  if (!hasAnyMatch) return null;

  const statCols: { key: keyof CollegeStats; label: string; fmt?: (v: any) => string }[] = [
    { key: "pointsPerGame", label: "PPG" },
    { key: "reboundsPerGame", label: "RPG" },
    { key: "assistsPerGame", label: "APG" },
    { key: "stealsPerGame", label: "SPG" },
    { key: "blocksPerGame", label: "BPG" },
    { key: "fgPct", label: "FG%", fmt: (v: number) => `${(v * 100).toFixed(1)}%` },
    { key: "fg3Pct", label: "3P%", fmt: (v: number) => `${(v * 100).toFixed(1)}%` },
    { key: "ftPct", label: "FT%", fmt: (v: number) => `${(v * 100).toFixed(1)}%` },
    { key: "minutesPerGame", label: "MPG" },
    { key: "turnoversPerGame", label: "TOV" },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-blue-500" />
          College Stats
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Most recent college season stats from Sports Reference
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" role="table">
            <thead>
              <tr className="border-b border-border">
                <th scope="col" className="text-left py-2 px-2 text-xs text-muted-foreground font-medium">Player</th>
                <th scope="col" className="text-left py-2 px-2 text-xs text-muted-foreground font-medium">School</th>
                <th scope="col" className="text-left py-2 px-2 text-xs text-muted-foreground font-medium">GP</th>
                {statCols.map(col => (
                  <th scope="col" key={col.key} className="text-right py-2 px-2 text-xs text-muted-foreground font-medium whitespace-nowrap">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {selected.map((player, idx) => {
                const stats = matchedStats[player.id];
                return (
                  <tr key={player.id} className="border-b border-border/50 last:border-0">
                    <td className="py-2.5 px-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ background: PLAYER_COLORS[idx] }}
                        />
                        <span className="font-medium text-sm truncate max-w-[120px]" data-testid={`college-stat-name-${player.id}`}>
                          {player.name}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-2 text-xs text-muted-foreground">
                      {stats ? stats.college : "—"}
                    </td>
                    <td className="py-2.5 px-2 text-xs text-muted-foreground">
                      {stats?.gamesPlayed ?? "—"}
                    </td>
                    {statCols.map(col => {
                      const val = stats ? (stats as any)[col.key] : null;
                      return (
                        <td
                          key={col.key}
                          className="py-2.5 px-2 text-right font-mono text-xs"
                          data-testid={`college-stat-${col.key}-${player.id}`}
                        >
                          {val != null
                            ? (col.fmt ? col.fmt(val) : Number(val).toFixed(1))
                            : "—"}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Compare() {
  const { sport, positions: sportPositions } = useSport();
  const { data: players, isLoading } = useQuery<Prospect[]>({
    queryKey: [`/api/prospects?sport=${sport}`],
  });

  const { data: nbaStats } = useQuery<PlayerSeasonStats[]>({
    queryKey: ["/api/nba-stats"],
    enabled: sport === "NBA",
  });

  const { data: collegeStats } = useQuery<CollegeStats[]>({
    queryKey: ["/api/college-stats?sport=NBA"],
    enabled: sport === "NBA",
    staleTime: 1000 * 60 * 60,
  });

  const [selected, setSelected] = useState<Prospect[]>([]);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [positionFilter, setPositionFilter] = useState("ALL");

  const metrics = useMemo(() => sport === "NFL" ? getNFLMetrics() : getNBAMetrics(), [sport]);

  const excludeIds = useMemo(() => new Set(selected.map(p => p.id)), [selected]);

  const addPlayer = useCallback((p: Prospect) => {
    if (selected.length < 4) {
      setSelected(prev => [...prev, p]);
      setSelectorOpen(false);
      setSearchQuery("");
    }
  }, [selected.length]);

  const removePlayer = useCallback((id: number) => {
    setSelected(prev => prev.filter(p => p.id !== id));
  }, []);

  const allPercentiles = useMemo(() => {
    if (!players || selected.length === 0) return {};
    const result: Record<string, Record<string, number>> = {};
    for (const metric of metrics) {
      const allVals = players.map(p => metric.extract(p)).filter((v): v is number => v != null);
      if (allVals.length === 0) continue;
      result[metric.key] = {};
      for (const p of selected) {
        const val = metric.extract(p);
        if (val != null) {
          result[metric.key][p.id] = computePercentile(val, allVals, metric.higherBetter);
        }
      }
    }
    return result;
  }, [players, selected, metrics]);

  const radarData = useMemo(() => {
    if (selected.length === 0) return [];
    return metrics.map(metric => {
      const point: Record<string, any> = { metric: metric.label };
      for (let i = 0; i < selected.length; i++) {
        const pctKey = `player${i}`;
        point[pctKey] = allPercentiles[metric.key]?.[selected[i].id] ?? 0;
      }
      return point;
    });
  }, [selected, metrics, allPercentiles]);

  const getWinner = useCallback((metric: MetricDef): Prospect | null => {
    if (selected.length < 2) return null;
    let best = selected[0];
    let bestVal = metric.extract(best);
    for (let i = 1; i < selected.length; i++) {
      const val = metric.extract(selected[i]);
      if (val == null) continue;
      if (bestVal == null || (metric.higherBetter ? val > bestVal : val < bestVal)) {
        best = selected[i];
        bestVal = val;
      }
    }
    return bestVal != null ? best : null;
  }, [selected]);

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-muted-foreground">Loading prospects...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-foreground" data-testid="text-compare-title">
              Player Comparison
            </h2>
            <p className="text-muted-foreground">
              Compare up to 4 prospects with advanced metrics and visual overlays.
            </p>
          </div>
          {selected.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelected([])}
              data-testid="button-clear-all"
            >
              Clear All
            </Button>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {selected.map((player, idx) => (
            <motion.div
              key={player.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <Card
                className="relative overflow-hidden"
                style={{ borderColor: PLAYER_COLORS[idx], borderWidth: 2 }}
                data-testid={`card-player-${player.id}`}
              >
                <div className="absolute inset-0 opacity-10" style={{ background: `linear-gradient(135deg, ${PLAYER_COLORS[idx]}, transparent)` }} />
                <button
                  onClick={() => removePlayer(player.id)}
                  className="absolute top-2 right-2 p-1 rounded-full bg-background/80 hover:bg-destructive hover:text-destructive-foreground transition-colors z-10"
                  data-testid={`button-remove-player-${player.id}`}
                  aria-label={`Remove ${player.name}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
                <CardContent className="p-4 relative">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold"
                      style={{ background: PLAYER_BG_COLORS[idx], color: PLAYER_COLORS[idx] }}
                    >
                      {player.grade}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-sm truncate">{player.name}</div>
                      <div className="text-xs text-muted-foreground">{player.position} • {player.college}</div>
                      <div className="text-xs text-muted-foreground">{player.height} • {player.weight} lbs</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
          {selected.length < 4 && (
            <motion.div layout className={selectorOpen ? "col-span-2" : ""}>
              {selectorOpen ? (
                <Card className="border-dashed border-2 border-primary/30">
                  <CardHeader className="p-3 pb-0">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">Add Prospect</CardTitle>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setSelectorOpen(false); setSearchQuery(""); }} aria-label="Close prospect selector">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-3 pt-2">
                    <PlayerSelector
                      players={players || []}
                      onSelect={addPlayer}
                      excludeIds={excludeIds}
                      searchQuery={searchQuery}
                      setSearchQuery={setSearchQuery}
                      positionFilter={positionFilter}
                      setPositionFilter={setPositionFilter}
                      sportPositions={sportPositions}
                    />
                  </CardContent>
                </Card>
              ) : (
                <button
                  onClick={() => setSelectorOpen(true)}
                  className="w-full h-full min-h-[120px] border-2 border-dashed border-muted-foreground/30 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-primary/50 hover:bg-primary/5 transition-all"
                  data-testid="button-add-player"
                >
                  <Plus className="h-8 w-8 text-muted-foreground/50" />
                  <span className="text-sm text-muted-foreground">Add Prospect</span>
                </button>
              )}
            </motion.div>
          )}
        </div>

        {selected.length >= 2 && (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Zap className="h-5 w-5 text-primary" />
                      Athletic Profile Overlay
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">Percentile rankings vs. all {sport} prospects</p>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={350}>
                      <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                        <PolarGrid stroke="hsl(var(--border))" />
                        <PolarAngleAxis
                          dataKey="metric"
                          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                        />
                        <PolarRadiusAxis
                          angle={90}
                          domain={[0, 100]}
                          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }}
                          tickCount={5}
                        />
                        {selected.map((_, i) => (
                          <Radar
                            key={selected[i].id}
                            name={selected[i].name}
                            dataKey={`player${i}`}
                            stroke={PLAYER_COLORS[i]}
                            fill={PLAYER_COLORS[i]}
                            fillOpacity={0.1}
                            strokeWidth={2}
                          />
                        ))}
                        <Legend
                          wrapperStyle={{ fontSize: 12 }}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <ArrowUpDown className="h-5 w-5 text-primary" />
                      Percentile Breakdown
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">How each player ranks among all prospects in the class</p>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={350}>
                      <BarChart data={radarData} layout="vertical" margin={{ left: 10, right: 20 }}>
                        <XAxis type="number" domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                        <YAxis
                          type="category"
                          dataKey="metric"
                          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                          width={100}
                        />
                        <Tooltip
                          contentStyle={{
                            background: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: 8,
                            fontSize: 12,
                          }}
                          formatter={(value: number) => [`${value}th percentile`, ""]}
                        />
                        {selected.map((player, i) => (
                          <Bar
                            key={player.id}
                            dataKey={`player${i}`}
                            name={player.name}
                            fill={PLAYER_COLORS[i]}
                            radius={[0, 4, 4, 0]}
                            barSize={selected.length <= 2 ? 16 : 10}
                          />
                        ))}
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Head-to-Head Metrics
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">Raw values with percentile bars and advantage indicators</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {metrics.map(metric => {
                      const winner = getWinner(metric);
                      return (
                        <div key={metric.key} className="space-y-2" data-testid={`metric-${metric.key}`}>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-muted-foreground">{metric.label}</span>
                            {winner && selected.length >= 2 && (
                              <Badge
                                variant="secondary"
                                className="text-xs"
                                style={{
                                  background: PLAYER_BG_COLORS[selected.indexOf(winner)],
                                  color: PLAYER_COLORS[selected.indexOf(winner)],
                                  borderColor: PLAYER_COLORS[selected.indexOf(winner)],
                                }}
                              >
                                <Trophy className="h-3 w-3 mr-1" />
                                {winner.name.split(" ").pop()}
                              </Badge>
                            )}
                          </div>
                          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${selected.length}, 1fr)` }}>
                            {selected.map((player, idx) => {
                              const val = metric.extract(player);
                              const pct = allPercentiles[metric.key]?.[player.id] ?? 0;
                              const isWinner = winner?.id === player.id && selected.length >= 2;
                              return (
                                <div
                                  key={player.id}
                                  className={cn(
                                    "rounded-lg p-3 transition-all",
                                    isWinner ? "ring-1" : "bg-muted/30"
                                  )}
                                  style={isWinner ? {
                                    background: PLAYER_BG_COLORS[idx],
                                    boxShadow: `inset 0 0 0 1px ${PLAYER_COLORS[idx]}`,
                                  } : undefined}
                                >
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs text-muted-foreground truncate">{player.name.split(" ").pop()}</span>
                                    <span className="text-xs font-mono font-bold" style={{ color: PLAYER_COLORS[idx] }}>
                                      {val != null ? `${val}${metric.unit}` : "—"}
                                    </span>
                                  </div>
                                  <div className="w-full h-2 bg-background rounded-full overflow-hidden">
                                    <motion.div
                                      className="h-full rounded-full"
                                      style={{ background: PLAYER_COLORS[idx] }}
                                      initial={{ width: 0 }}
                                      animate={{ width: `${pct}%` }}
                                      transition={{ duration: 0.8, ease: "easeOut" }}
                                    />
                                  </div>
                                  <div className="text-right mt-0.5">
                                    <span className="text-[10px] text-muted-foreground">{pct}th pctl</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {sport === "NBA" && nbaStats && nbaStats.length > 0 && (
                <NBASeasonStatsSection selected={selected} nbaStats={nbaStats} />
              )}

              {sport === "NBA" && collegeStats && collegeStats.length > 0 && (
                <CollegeStatsSection selected={selected} collegeStats={collegeStats} />
              )}

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-primary" />
                    Comparison Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${selected.length}, 1fr)` }}>
                    {selected.map((player, idx) => {
                      const wins = metrics.filter(m => getWinner(m)?.id === player.id).length;
                      const avgPct = metrics.reduce((sum, m) => sum + (allPercentiles[m.key]?.[player.id] ?? 0), 0) / metrics.length;

                      const strengths = metrics
                        .map(m => ({ metric: m, pct: allPercentiles[m.key]?.[player.id] ?? 0 }))
                        .sort((a, b) => b.pct - a.pct)
                        .slice(0, 2);

                      const weaknesses = metrics
                        .map(m => ({ metric: m, pct: allPercentiles[m.key]?.[player.id] ?? 0 }))
                        .filter(x => x.pct < 50)
                        .sort((a, b) => a.pct - b.pct)
                        .slice(0, 2);

                      return (
                        <div
                          key={player.id}
                          className="rounded-xl p-4 space-y-3"
                          style={{ background: PLAYER_BG_COLORS[idx], border: `1px solid ${PLAYER_COLORS[idx]}30` }}
                          data-testid={`summary-player-${player.id}`}
                        >
                          <div className="text-center">
                            <div
                              className="w-14 h-14 rounded-full mx-auto flex items-center justify-center text-xl font-bold mb-2"
                              style={{ background: `${PLAYER_COLORS[idx]}20`, color: PLAYER_COLORS[idx] }}
                            >
                              {player.grade}
                            </div>
                            <div className="font-bold text-sm">{player.name}</div>
                            <div className="text-xs text-muted-foreground">{player.position} • {player.college}</div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-center">
                            <div className="bg-background/50 rounded-lg p-2">
                              <div className="text-lg font-bold" style={{ color: PLAYER_COLORS[idx] }}>{wins}</div>
                              <div className="text-[10px] text-muted-foreground">Category Wins</div>
                            </div>
                            <div className="bg-background/50 rounded-lg p-2">
                              <div className="text-lg font-bold" style={{ color: PLAYER_COLORS[idx] }}>{Math.round(avgPct)}</div>
                              <div className="text-[10px] text-muted-foreground">Avg Percentile</div>
                            </div>
                          </div>

                          {strengths.length > 0 && (
                            <div>
                              <div className="text-[10px] font-semibold text-emerald-500 uppercase tracking-wider mb-1">Strengths</div>
                              {strengths.map(s => (
                                <div key={s.metric.key} className="text-xs text-muted-foreground flex justify-between">
                                  <span>{s.metric.label}</span>
                                  <span className="text-emerald-400 font-mono">{s.pct}th</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {weaknesses.length > 0 && (
                            <div>
                              <div className="text-[10px] font-semibold text-amber-500 uppercase tracking-wider mb-1">Areas to Watch</div>
                              {weaknesses.map(w => (
                                <div key={w.metric.key} className="text-xs text-muted-foreground flex justify-between">
                                  <span>{w.metric.label}</span>
                                  <span className="text-amber-400 font-mono">{w.pct}th</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </AnimatePresence>
        )}

        {selected.length < 2 && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <ArrowUpDown className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <h3 className="font-display text-lg font-bold mb-1">Select at Least 2 Prospects</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Add prospects above to compare their draft grades, combine metrics, and athletic profiles
                with radar charts, percentile breakdowns, and head-to-head analysis.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}

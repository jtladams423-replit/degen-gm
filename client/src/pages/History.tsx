import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileDown, FileUp, Trash2, AlertCircle, Loader2, Search,
  TrendingUp, TrendingDown, ChevronDown, ChevronUp, ArrowLeftRight,
  Award, Calendar, Users, Download, Save, RotateCcw, Wrench
} from "lucide-react";
import { useRef, useState, useMemo, useCallback } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { MockDraft, HistoricalPerformance, TeamBuilderSave } from "@shared/schema";
import { useSport } from "@/lib/sportContext";
import { type TeamBuilderState, getTeamBuilderState, saveTeamBuilderState } from "./TeamBuilder";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Cell
} from "recharts";
import { cn } from "@/lib/utils";

interface DraftPick {
  id: string;
  round: number;
  overall: number;
  teamAlias: string;
  teamName: string;
  teamId: string;
  playerName: string;
  position: string;
  college: string;
  traded: boolean;
  trades: any[];
}

interface DraftSummaryData {
  draft?: {
    year?: number;
    status?: string;
    rounds?: Array<{
      number: number;
      picks?: Array<{
        id?: string;
        number: number;
        overall?: number;
        team?: { alias?: string; market?: string; name?: string; id?: string };
        prospect?: {
          first_name?: string;
          last_name?: string;
          name?: string;
          position?: string;
          pos?: string;
          source?: { team?: { name?: string } };
          college?: string;
        };
        traded?: boolean;
        trade?: any;
        trades?: any[];
      }>;
    }>;
  };
}

function normalizePicks(data: DraftSummaryData): DraftPick[] {
  if (!data?.draft?.rounds) return [];
  const picks: DraftPick[] = [];
  for (const round of data.draft.rounds) {
    if (!round.picks) continue;
    for (const pick of round.picks) {
      const prospect = pick.prospect || {};
      picks.push({
        id: pick.id || `${round.number}-${pick.number}`,
        round: round.number,
        overall: pick.overall || pick.number,
        teamAlias: pick.team?.alias || pick.team?.market || "",
        teamName: pick.team ? `${pick.team.market || ""} ${pick.team.name || ""}`.trim() : "",
        teamId: pick.team?.id || "",
        playerName: prospect.name
          ? `${prospect.first_name || ""} ${prospect.last_name || ""}`.trim() || prospect.name
          : "TBD",
        position: prospect.position || prospect.pos || "",
        college: prospect.source?.team?.name || prospect.college || "",
        traded: !!(pick.traded || pick.trade),
        trades: pick.trades || [],
      });
    }
  }
  return picks.sort((a, b) => a.overall - b.overall);
}

const POSITION_COLORS: Record<string, string> = {
  QB: "#e74c3c", RB: "#2ecc71", WR: "#3498db", TE: "#9b59b6",
  OT: "#f39c12", OL: "#f39c12", OG: "#f39c12", C: "#f39c12", G: "#f39c12",
  EDGE: "#e67e22", DE: "#e67e22", DL: "#d35400", DT: "#d35400",
  LB: "#1abc9c", ILB: "#1abc9c", OLB: "#1abc9c",
  CB: "#2980b9", S: "#8e44ad", DB: "#8e44ad",
  K: "#7f8c8d", P: "#7f8c8d", LS: "#7f8c8d",
};

function getPositionColor(pos: string) {
  return POSITION_COLORS[pos] || "#95a5a6";
}

function PastDraftsTab() {
  const { sport } = useSport();
  const [selectedYear, setSelectedYear] = useState(2025);
  const [selectedRound, setSelectedRound] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [positionFilter, setPositionFilter] = useState<string | null>(null);
  const [expandedPick, setExpandedPick] = useState<string | null>(null);

  const { data: summaryData, isLoading, error } = useQuery<DraftSummaryData>({
    queryKey: [`/api/draft/${selectedYear}/summary`],
    staleTime: 1000 * 60 * 10,
    retry: 1,
  });

  const picks = useMemo(() => summaryData ? normalizePicks(summaryData) : [], [summaryData]);

  const rounds = useMemo(() => {
    const roundSet = new Set(picks.map(p => p.round));
    return Array.from(roundSet).sort((a, b) => a - b);
  }, [picks]);

  const positions = useMemo(() => {
    const posSet = new Set(picks.map(p => p.position).filter(Boolean));
    return Array.from(posSet).sort();
  }, [picks]);

  const filteredPicks = useMemo(() => {
    return picks.filter(p => {
      if (selectedRound !== null && p.round !== selectedRound) return false;
      if (positionFilter && p.position !== positionFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return p.playerName.toLowerCase().includes(q) ||
          p.teamName.toLowerCase().includes(q) ||
          p.teamAlias.toLowerCase().includes(q) ||
          p.college.toLowerCase().includes(q) ||
          p.position.toLowerCase().includes(q);
      }
      return true;
    });
  }, [picks, selectedRound, positionFilter, searchQuery]);

  const positionStats = useMemo(() => {
    const stats: Record<string, number> = {};
    picks.forEach(p => {
      if (p.position) stats[p.position] = (stats[p.position] || 0) + 1;
    });
    return Object.entries(stats)
      .map(([name, value]) => ({ name, value, fill: getPositionColor(name) }))
      .sort((a, b) => b.value - a.value);
  }, [picks]);

  const roundStats = useMemo(() => {
    return rounds.map(r => {
      const roundPicks = picks.filter(p => p.round === r);
      const posBreakdown: Record<string, number> = {};
      roundPicks.forEach(p => {
        if (p.position) posBreakdown[p.position] = (posBreakdown[p.position] || 0) + 1;
      });
      const topPos = Object.entries(posBreakdown).sort((a, b) => b[1] - a[1])[0];
      return {
        round: r,
        picks: roundPicks.length,
        topPosition: topPos ? topPos[0] : "",
        topPositionCount: topPos ? topPos[1] : 0,
        traded: roundPicks.filter(p => p.traded).length,
      };
    });
  }, [picks, rounds]);

  const handleExportCSV = useCallback(() => {
    const headers = ['Overall', 'Round', 'Team', 'Team Name', 'Player', 'Position', 'College', 'Traded'];
    const rows = filteredPicks.map(p => [
      p.overall, p.round, p.teamAlias, p.teamName, p.playerName, p.position, p.college, p.traded ? 'Yes' : 'No'
    ]);
    const escapeCSV = (cell: string | number | boolean) => {
      const str = String(cell);
      return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
    };
    const csv = [headers, ...rows].map(row => row.map(escapeCSV).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${sport.toLowerCase()}_draft_${selectedYear}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [filteredPicks, selectedYear]);

  const years = [2025, 2024, 2023, 2022];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {years.map(y => (
            <Button
              key={y}
              variant={selectedYear === y ? "default" : "outline"}
              size="sm"
              onClick={() => { setSelectedYear(y); setSelectedRound(null); setPositionFilter(null); setSearchQuery(""); }}
              className="gap-1.5"
              data-testid={`button-year-${y}`}
            >
              <Calendar className="h-3.5 w-3.5" /> {y}
            </Button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-1.5" data-testid="button-export-draft-csv" disabled={picks.length === 0}>
            <Download className="h-3.5 w-3.5" /> Export CSV
          </Button>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-3 text-muted-foreground">Loading {selectedYear} draft data...</span>
        </div>
      )}

      {error && (
        <Card className="border-destructive/50">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <p className="font-medium text-destructive mb-1">Failed to load {selectedYear} draft data</p>
            <p className="text-sm text-muted-foreground">Draft data may not be available for this year yet. Check back later.</p>
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && picks.length > 0 && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            <Card>
              <CardContent className="pt-3 pb-2 sm:pt-4 sm:pb-3 px-3 sm:px-4 text-center">
                <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">Total Picks</p>
                <p className="text-xl sm:text-2xl font-display font-bold" data-testid="text-total-picks">{picks.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-3 pb-2 sm:pt-4 sm:pb-3 px-3 sm:px-4 text-center">
                <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">Rounds</p>
                <p className="text-xl sm:text-2xl font-display font-bold" data-testid="text-total-rounds">{rounds.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-3 pb-2 sm:pt-4 sm:pb-3 px-3 sm:px-4 text-center">
                <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">Traded Picks</p>
                <p className="text-xl sm:text-2xl font-display font-bold text-orange-400" data-testid="text-traded-picks">
                  {picks.filter(p => p.traded).length}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-3 pb-2 sm:pt-4 sm:pb-3 px-3 sm:px-4 text-center">
                <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">Top Position</p>
                <p className="text-xl sm:text-2xl font-display font-bold" data-testid="text-top-position">
                  {positionStats[0]?.name || "—"} <span className="text-xs sm:text-sm text-muted-foreground">({positionStats[0]?.value || 0})</span>
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base sm:text-lg">Position Distribution</CardTitle>
              </CardHeader>
              <CardContent className="h-[180px] sm:h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={positionStats.slice(0, 12)} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} stroke="transparent" />
                    <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} stroke="transparent" width={30} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {positionStats.slice(0, 12).map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Round Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {roundStats.map(rs => (
                    <div key={rs.round} className="flex items-center gap-3 text-sm">
                      <span className="font-mono text-muted-foreground w-12">Rd {rs.round}</span>
                      <div className="flex-1 bg-muted rounded-full h-5 overflow-hidden">
                        <div
                          className="h-full bg-primary/60 rounded-full flex items-center px-2"
                          style={{ width: `${Math.max((rs.picks / (picks.length / rounds.length)) * 50, 20)}%` }}
                        >
                          <span className="text-[10px] font-medium text-primary-foreground">{rs.picks}</span>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px] h-5 px-1.5">{rs.topPosition}</Badge>
                      {rs.traded > 0 && (
                        <span className="text-[10px] text-orange-400 flex items-center gap-0.5">
                          <ArrowLeftRight className="h-2.5 w-2.5" />{rs.traded}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
                <CardTitle className="text-lg">{selectedYear} Draft Board</CardTitle>
                <div className="flex gap-2 flex-wrap items-center">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Search player, team, school..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="h-8 pl-8 w-56 text-sm"
                      data-testid="input-search-draft"
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-1 sm:gap-1.5 flex-wrap mt-2 overflow-x-auto no-scrollbar">
                <Button
                  variant={selectedRound === null ? "default" : "ghost"}
                  size="sm"
                  className="h-6 text-[10px] sm:text-xs px-1.5 sm:px-2"
                  onClick={() => setSelectedRound(null)}
                  data-testid="button-round-all"
                >
                  All
                </Button>
                {rounds.map(r => (
                  <Button
                    key={r}
                    variant={selectedRound === r ? "default" : "ghost"}
                    size="sm"
                    className="h-6 text-[10px] sm:text-xs px-1.5 sm:px-2"
                    onClick={() => setSelectedRound(r)}
                    data-testid={`button-round-${r}`}
                  >
                    Rd {r}
                  </Button>
                ))}
                <span className="text-muted-foreground mx-0.5 sm:mx-1">|</span>
                <Button
                  variant={positionFilter === null ? "default" : "ghost"}
                  size="sm"
                  className="h-6 text-[10px] sm:text-xs px-1.5 sm:px-2"
                  onClick={() => setPositionFilter(null)}
                >
                  All Pos
                </Button>
                {positions.slice(0, 8).map(pos => (
                  <Button
                    key={pos}
                    variant={positionFilter === pos ? "default" : "ghost"}
                    size="sm"
                    className="h-6 text-[10px] sm:text-xs px-1.5 sm:px-2"
                    onClick={() => setPositionFilter(positionFilter === pos ? null : pos)}
                  >
                    {pos}
                  </Button>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 max-h-[55vh] overflow-y-auto pr-1">
                {filteredPicks.map(pick => (
                  <div
                    key={pick.id}
                    className={cn(
                      "border border-border rounded-lg overflow-hidden transition-colors",
                      pick.traded && "border-l-2 border-l-orange-400",
                      expandedPick === pick.id && "bg-muted/20"
                    )}
                    data-testid={`pick-row-${pick.overall}`}
                  >
                    <button
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-muted/30 transition-colors"
                      onClick={() => setExpandedPick(expandedPick === pick.id ? null : pick.id)}
                    >
                      <span className="font-mono text-sm text-muted-foreground w-8 text-right shrink-0">
                        #{pick.overall}
                      </span>
                      <span className="text-xs text-muted-foreground w-10 shrink-0">
                        Rd {pick.round}
                      </span>
                      <div
                        className="h-7 w-7 rounded-full flex items-center justify-center text-[8px] font-bold text-white shrink-0"
                        style={{ backgroundColor: getPositionColor(pick.position) }}
                      >
                        {pick.position || "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">{pick.playerName}</span>
                          {pick.traded && (
                            <Badge variant="outline" className="text-[9px] h-4 px-1 text-orange-400 border-orange-400/30">
                              <ArrowLeftRight className="h-2.5 w-2.5 mr-0.5" /> Trade
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {pick.teamName} ({pick.teamAlias}) • {pick.college}
                        </p>
                      </div>
                      {expandedPick === pick.id ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                    </button>
                    {expandedPick === pick.id && (
                      <div className="border-t border-border bg-muted/10 px-4 py-3">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase">Team</p>
                            <p className="font-medium">{pick.teamName}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase">Position</p>
                            <p className="font-medium">{pick.position}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase">School</p>
                            <p className="font-medium">{pick.college}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase">Pick Info</p>
                            <p className="font-medium">Round {pick.round}, Pick #{pick.overall}</p>
                          </div>
                        </div>
                        {pick.traded && pick.trades.length > 0 && (
                          <div className="mt-2 p-2 bg-orange-500/5 border border-orange-500/20 rounded text-xs">
                            <p className="font-medium text-orange-400 mb-1">Trade Details</p>
                            <p className="text-muted-foreground">This pick was involved in a trade.</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                {filteredPicks.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Search className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p>No picks match your filters.</p>
                  </div>
                )}
              </div>
              <div className="mt-3 text-xs text-muted-foreground text-right">
                Showing {filteredPicks.length} of {picks.length} picks
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {!isLoading && !error && picks.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center py-12 text-muted-foreground text-center">
            <Calendar className="h-12 w-12 mb-4 opacity-20" />
            <p className="font-medium">No draft data available for {selectedYear}</p>
            <p className="text-sm mt-1">Try selecting a different year.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SavedMocksTab() {
  const { sport, maxRounds } = useSport();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: mocks = [], isLoading } = useQuery<MockDraft[]>({
    queryKey: [`/api/mock-drafts?sport=${sport}`],
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/mock-drafts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/mock-drafts?sport=${sport}`] });
      toast({ title: "Draft Deleted", description: "The mock draft has been removed." });
    },
  });

  const importMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/mock-drafts", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/mock-drafts?sport=${sport}`] });
    },
  });

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed) || (parsed.year && parsed.picks)) {
          importMutation.mutate({
            name: file.name.replace(".json", "") || "Imported Mock",
            year: sport === "NFL" ? 2026 : 2025,
            method: "External",
            rounds: parsed.rounds || maxRounds,
            teamScope: "Imported",
            sport,
            picks: parsed.picks || [],
          });
          toast({ title: "Import Successful", description: `Successfully imported "${file.name}"` });
        } else {
          throw new Error("Invalid format");
        }
      } catch {
        toast({ title: "Import Failed", description: "Invalid file format. Please upload a valid JSON mock draft.", variant: "destructive" });
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(mocks, null, 2));
    const link = document.createElement('a');
    link.href = dataStr;
    link.download = "draft_history.json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    toast({ title: "Export Started", description: "Your draft history is being downloaded." });
  };

  const formatDate = (dateStr: string | Date) => {
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <input type="file" ref={fileInputRef} onChange={handleImport} accept=".json" className="hidden" />
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => fileInputRef.current?.click()} data-testid="button-import">
          <FileUp className="h-3.5 w-3.5" /> Import JSON
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExport} data-testid="button-export">
          <FileDown className="h-3.5 w-3.5" /> Export All
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Saved Mock Drafts</CardTitle>
        </CardHeader>
        <CardContent>
          {mocks.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Draft Name</TableHead>
                  <TableHead className="hidden md:table-cell">Date</TableHead>
                  <TableHead>Config</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mocks.map((mock) => (
                  <TableRow key={mock.id} data-testid={`row-mock-${mock.id}`}>
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span>{mock.name}</span>
                        <span className="text-xs text-muted-foreground md:hidden">{formatDate(mock.createdAt)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden md:table-cell">{formatDate(mock.createdAt)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="mr-2">{mock.rounds} Rnds</Badge>
                      <Badge variant="outline">{mock.teamScope}</Badge>
                    </TableCell>
                    <TableCell>{mock.method}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => deleteMutation.mutate(mock.id)}
                        data-testid={`button-delete-${mock.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mb-4 opacity-20" />
              <p>No mock drafts saved yet.</p>
              <p className="text-sm mt-1">Run a mock draft and save it, or import a JSON file.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PerformanceTab() {
  const { sport } = useSport();

  const { data: perfData = [], isLoading } = useQuery<HistoricalPerformance[]>({
    queryKey: [`/api/historical-performance?sport=${sport}`],
  });

  const years = useMemo(() => {
    const yearSet = new Set(perfData.map(d => d.year));
    return Array.from(yearSet).sort((a, b) => b - a);
  }, [perfData]);

  const yearlyStats = useMemo(() => {
    return years.map(year => {
      const yearData = perfData.filter(d => d.year === year);
      const avgValue = yearData.length > 0 ? Math.round(yearData.reduce((s, d) => s + d.valueDiff, 0) / yearData.length) : 0;
      const steals = yearData.filter(d => d.valueDiff > 0).length;
      const reaches = yearData.filter(d => d.valueDiff < 0).length;
      const bestPick = yearData.reduce((best, d) => d.valueDiff > (best?.valueDiff ?? -Infinity) ? d : best, yearData[0]);
      const worstPick = yearData.reduce((worst, d) => d.valueDiff < (worst?.valueDiff ?? Infinity) ? d : worst, yearData[0]);
      return { year, avgValue, steals, reaches, bestPick, worstPick, total: yearData.length };
    });
  }, [perfData, years]);

  const positionPerformance = useMemo(() => {
    const posStats: Record<string, { total: number; count: number; steals: number; reaches: number }> = {};
    perfData.forEach(d => {
      if (!posStats[d.position]) posStats[d.position] = { total: 0, count: 0, steals: 0, reaches: 0 };
      posStats[d.position].total += d.valueDiff;
      posStats[d.position].count++;
      if (d.valueDiff > 0) posStats[d.position].steals++;
      if (d.valueDiff < 0) posStats[d.position].reaches++;
    });
    return Object.entries(posStats)
      .map(([pos, stats]) => ({
        position: pos,
        avgValue: Math.round((stats.total / stats.count) * 10) / 10,
        count: stats.count,
        steals: stats.steals,
        reaches: stats.reaches,
      }))
      .sort((a, b) => b.avgValue - a.avgValue);
  }, [perfData]);

  const topSteals = useMemo(() =>
    [...perfData].filter(d => d.valueDiff > 0).sort((a, b) => b.valueDiff - a.valueDiff).slice(0, 5),
    [perfData]
  );

  const topReaches = useMemo(() =>
    [...perfData].filter(d => d.valueDiff < 0).sort((a, b) => a.valueDiff - b.valueDiff).slice(0, 5),
    [perfData]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (perfData.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center py-12 text-muted-foreground text-center">
          <TrendingUp className="h-12 w-12 mb-4 opacity-20" />
          <p className="font-medium">No performance data available</p>
          <p className="text-sm mt-1">Historical draft performance data will appear here.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {yearlyStats.map(ys => (
          <Card key={ys.year} data-testid={`card-year-${ys.year}`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                {ys.year} Draft Class
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Avg Value</p>
                  <p className={cn("text-xl font-bold font-display", ys.avgValue > 0 ? "text-emerald-400" : ys.avgValue < 0 ? "text-red-400" : "text-muted-foreground")}>
                    {ys.avgValue > 0 ? "+" : ""}{ys.avgValue}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Steals</p>
                  <p className="text-xl font-bold font-display text-emerald-400">{ys.steals}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Reaches</p>
                  <p className="text-xl font-bold font-display text-red-400">{ys.reaches}</p>
                </div>
              </div>
              {ys.bestPick && (
                <div className="mt-3 text-xs space-y-1">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-3 w-3 text-emerald-400 shrink-0" />
                    <span className="text-muted-foreground">Best:</span>
                    <span className="font-medium truncate">{ys.bestPick.player}</span>
                    <span className="text-emerald-400 shrink-0">+{ys.bestPick.valueDiff}</span>
                  </div>
                  {ys.worstPick && ys.worstPick.valueDiff < 0 && (
                    <div className="flex items-center gap-2">
                      <TrendingDown className="h-3 w-3 text-red-400 shrink-0" />
                      <span className="text-muted-foreground">Worst:</span>
                      <span className="font-medium truncate">{ys.worstPick.player}</span>
                      <span className="text-red-400 shrink-0">{ys.worstPick.valueDiff}</span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Value Added by Pick</CardTitle>
          <CardDescription>Positive = exceeded expectations (Steal). Negative = underperformed (Reach). Based on Career Approximate Value.</CardDescription>
        </CardHeader>
        <CardContent className="h-[250px] sm:h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={perfData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="player" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} stroke="transparent" angle={-30} textAnchor="end" height={60} />
              <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} stroke="transparent" label={{ value: 'Value Diff (AV)', angle: -90, position: 'insideLeft', fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
                formatter={(value: number) => [`${value > 0 ? '+' : ''}${value}`, 'Value Diff']}
                labelFormatter={(label: string) => {
                  const entry = perfData.find(d => d.player === label);
                  return entry ? `${label} (${entry.team}, Pick #${entry.pick}, ${entry.year})` : label;
                }}
              />
              <ReferenceLine y={0} stroke="hsl(var(--foreground))" strokeOpacity={0.3} />
              <Bar dataKey="valueDiff" radius={[4, 4, 0, 0]}>
                {perfData.map((entry, index) => (
                  <Cell key={index} fill={entry.valueDiff > 0 ? 'hsl(var(--chart-2))' : 'hsl(var(--destructive))'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
              Top Steals
            </CardTitle>
            <CardDescription>Highest value-over-expectation picks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topSteals.map((player) => (
                <div key={player.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border" data-testid={`steal-${player.id}`}>
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-sm">
                      +{player.valueDiff}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{player.player}</p>
                      <p className="text-xs text-muted-foreground">{player.team} • Pick #{player.pick} • {player.year} • {player.position}</p>
                    </div>
                  </div>
                  <div className="text-right text-xs">
                    <p className="text-muted-foreground">AV: {player.av}</p>
                    <p className="text-muted-foreground">Expected: {player.expectedAv}</p>
                  </div>
                </div>
              ))}
              {topSteals.length === 0 && <p className="text-center text-muted-foreground text-sm py-4">No steals recorded.</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-400" />
              Notable Reaches
            </CardTitle>
            <CardDescription>Lowest value-over-expectation picks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topReaches.map((player) => (
                <div key={player.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border" data-testid={`reach-${player.id}`}>
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 font-bold text-sm">
                      {player.valueDiff}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{player.player}</p>
                      <p className="text-xs text-muted-foreground">{player.team} • Pick #{player.pick} • {player.year} • {player.position}</p>
                    </div>
                  </div>
                  <div className="text-right text-xs">
                    <p className="text-muted-foreground">AV: {player.av}</p>
                    <p className="text-muted-foreground">Expected: {player.expectedAv}</p>
                  </div>
                </div>
              ))}
              {topReaches.length === 0 && <p className="text-center text-muted-foreground text-sm py-4">No reaches recorded.</p>}
            </div>
          </CardContent>
        </Card>
      </div>

      {positionPerformance.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Performance by Position</CardTitle>
            <CardDescription>Average value differential by position across all tracked drafts</CardDescription>
          </CardHeader>
          <CardContent className="h-[220px] sm:h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={positionPerformance} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="position" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} stroke="transparent" />
                <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} stroke="transparent" />
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
                  formatter={(value: number, name: string) => {
                    if (name === 'avgValue') return [`${value > 0 ? '+' : ''}${value}`, 'Avg Value Diff'];
                    return [value, name];
                  }}
                />
                <ReferenceLine y={0} stroke="hsl(var(--foreground))" strokeOpacity={0.3} />
                <Bar dataKey="avgValue" radius={[4, 4, 0, 0]}>
                  {positionPerformance.map((entry, i) => (
                    <Cell key={i} fill={entry.avgValue > 0 ? 'hsl(var(--chart-2))' : 'hsl(var(--destructive))'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function TeamBuilderSavesTab() {
  const { sport } = useSport();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const { data: saves, isLoading } = useQuery<TeamBuilderSave[]>({
    queryKey: [`/api/team-builder-saves?sport=${sport}`],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/team-builder-saves/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/team-builder-saves?sport=${sport}`] });
      toast({ title: "Deleted", description: "Save removed." });
    },
  });

  const handleRestore = useCallback((save: TeamBuilderSave) => {
    const state = save.state as TeamBuilderState;
    saveTeamBuilderState(state, sport);
    toast({ title: "Restored!", description: `"${save.name}" has been loaded into Team Builder.` });
    navigate("/team-builder");
  }, [sport, toast, navigate]);

  const handleExport = useCallback((save: TeamBuilderSave) => {
    const data = {
      sport: save.sport,
      state: save.state,
      exportedAt: new Date().toISOString(),
      savedAt: save.createdAt,
      name: save.name,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `degen-gm-${save.name.replace(/\s+/g, "-").toLowerCase()}-${save.sport.toLowerCase()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">Loading saves...</span>
      </div>
    );
  }

  if (!saves?.length) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center py-12 text-center">
          <Save className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <p className="font-medium text-muted-foreground mb-1">No Team Builder saves yet</p>
          <p className="text-sm text-muted-foreground/70">Go to Team Builder, make changes, and click Save to create a snapshot.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {saves.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((save) => {
        const state = save.state as TeamBuilderState;
        const teamCount = Object.keys(state).filter(k => (state[k]?.signedFAs?.length > 0) || (state[k]?.releasedPlayers?.length > 0)).length;
        const totalFAs = Object.values(state).reduce((sum, ts) => sum + (ts?.signedFAs?.length || 0), 0);
        const totalReleased = Object.values(state).reduce((sum, ts) => sum + (ts?.releasedPlayers?.length || 0), 0);

        return (
          <Card key={save.id} className="border-border/50" data-testid={`tb-save-${save.id}`}>
            <CardContent className="py-3 px-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-sm truncate">{save.name}</h4>
                    <Badge variant="secondary" className="text-[10px] shrink-0">{save.sport}</Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                    <span>{new Date(save.createdAt).toLocaleDateString()} {new Date(save.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <span>{teamCount} team{teamCount !== 1 ? 's' : ''} modified</span>
                    <span>{totalFAs} FA{totalFAs !== 1 ? 's' : ''} signed</span>
                    {totalReleased > 0 && <span>{totalReleased} released</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => handleRestore(save)}
                    data-testid={`button-restore-${save.id}`}
                  >
                    <RotateCcw className="h-3 w-3" /> Go To
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => handleExport(save)}
                    data-testid={`button-export-save-${save.id}`}
                  >
                    <Download className="h-3 w-3" /> Export
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-red-400 hover:text-red-300"
                    onClick={() => deleteMutation.mutate(save.id)}
                    disabled={deleteMutation.isPending}
                    data-testid={`button-delete-save-${save.id}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export default function History() {
  const [activeTab, setActiveTab] = useState("past-drafts");
  const { sport } = useSport();

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-display font-bold text-foreground" data-testid="text-page-title">Draft History</h2>
          <p className="text-sm sm:text-base text-muted-foreground">Explore past {sport} drafts, review saved mocks, and analyze player performance over time.</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 w-full max-w-lg text-xs sm:text-sm">
            <TabsTrigger value="past-drafts" className="gap-1.5" data-testid="tab-past-drafts">
              <Calendar className="h-3.5 w-3.5" /> Past Drafts
            </TabsTrigger>
            <TabsTrigger value="saved-mocks" className="gap-1.5" data-testid="tab-saved-mocks">
              <Users className="h-3.5 w-3.5" /> Saved Mocks
            </TabsTrigger>
            <TabsTrigger value="team-builder" className="gap-1.5" data-testid="tab-team-builder">
              <Wrench className="h-3.5 w-3.5" /> Team Builder
            </TabsTrigger>
            <TabsTrigger value="performance" className="gap-1.5" data-testid="tab-performance">
              <Award className="h-3.5 w-3.5" /> Performance
            </TabsTrigger>
          </TabsList>

          <TabsContent value="past-drafts">
            <PastDraftsTab />
          </TabsContent>

          <TabsContent value="saved-mocks">
            <SavedMocksTab />
          </TabsContent>

          <TabsContent value="team-builder">
            <TeamBuilderSavesTab />
          </TabsContent>

          <TabsContent value="performance">
            <PerformanceTab />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}

import Layout from "@/components/Layout";
import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
  Search,
  DollarSign,
  Plus,
  X,
  ChevronDown,
  CheckCircle2,
  AlertTriangle,
  Users,
  Target,
  Play,
  Trash2,
  RotateCcw,
  Shield,
  ClipboardList,
  FileText,
  ChevronRight,
  GraduationCap,
  Save,
  Download,
  Upload,
  Scissors,
  Undo2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import type { Team, FreeAgent, DraftOrderEntry, RosterPlayer, PlayerSeasonStats } from "@shared/schema";
import { useSport } from "@/lib/sportContext";
import { loadMockRookies, clearMockRookies, type MockRookie } from "@/lib/rookieScale";
import { Activity, RefreshCw } from "lucide-react";

export interface TeamBuilderState {
  [teamCode: string]: {
    signedFAs: FreeAgent[];
    removedNeeds: string[];
    releasedPlayers: number[];
  };
}

function getTBKey(sport: string) {
  return `draftscout_team_builder_${sport.toLowerCase()}`;
}

function loadTeamBuilderState(sport = "NFL"): TeamBuilderState {
  try {
    const raw = localStorage.getItem(getTBKey(sport));
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

export function saveTeamBuilderState(state: TeamBuilderState, sport = "NFL") {
  localStorage.setItem(getTBKey(sport), JSON.stringify(state));
}

export function getTeamBuilderState(sport = "NFL"): TeamBuilderState {
  return loadTeamBuilderState(sport);
}

type RightPanelTab = "roster" | "capSheet" | "seasonStats" | "freeAgents";

const OFFENSE_POSITIONS = ["QB", "RB", "WR", "TE", "OT", "OL"];
const DEFENSE_POSITIONS = ["EDGE", "DT", "DL", "LB", "CB", "S"];
const SPECIAL_POSITIONS = ["K", "P"];

const POSITION_LABELS: Record<string, string> = {
  QB: "Quarterback", RB: "Running Back", WR: "Wide Receiver", TE: "Tight End",
  OT: "Offensive Tackle", OL: "Interior O-Line",
  EDGE: "Edge Rusher", DT: "Defensive Tackle", DL: "Defensive Line",
  LB: "Linebacker", CB: "Cornerback", S: "Safety",
  K: "Kicker", P: "Punter",
};

function getDepthLabel(depth: number) {
  if (depth === 1) return "Starter";
  if (depth === 2) return "Backup";
  return `${depth}rd`;
}

function getContractColor(years: number | null) {
  if (!years) return "text-muted-foreground";
  if (years <= 1) return "text-red-400";
  if (years <= 2) return "text-yellow-400";
  return "text-emerald-400";
}

export default function TeamBuilder() {
  const [, navigate] = useLocation();
  const { sport } = useSport();
  const { toast } = useToast();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: teamsData, isLoading: teamsLoading } = useQuery<Team[]>({ queryKey: [`/api/teams?sport=${sport}`] });
  const { data: freeAgentsData, isLoading: faLoading } = useQuery<FreeAgent[]>({ queryKey: [`/api/free-agents?sport=${sport}`] });
  const { data: draftOrderData } = useQuery<DraftOrderEntry[]>({ queryKey: [`/api/draft-order?sport=${sport}`] });
  const { data: rosterData } = useQuery<RosterPlayer[]>({ queryKey: [`/api/roster?sport=${sport}`] });
  const { data: nbaStatsData, refetch: refetchNbaStats, isFetching: nbaStatsFetching } = useQuery<PlayerSeasonStats[]>({
    queryKey: ["/api/nba-stats"],
    enabled: sport === "NBA",
  });

  const [selectedTeamCode, setSelectedTeamCode] = useState<string | null>(null);
  const [builderState, setBuilderState] = useState<TeamBuilderState>(() => loadTeamBuilderState(sport));
  const [searchQuery, setSearchQuery] = useState("");
  const [posFilter, setPosFilter] = useState("ALL");
  const [showTeamPicker, setShowTeamPicker] = useState(false);
  const [confirmFA, setConfirmFA] = useState<FreeAgent | null>(null);
  const [rightTab, setRightTab] = useState<RightPanelTab>("capSheet");
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({ offense: true, defense: true, special: false });
  const [mockRookies, setMockRookies] = useState<MockRookie[]>(() => loadMockRookies(sport));
  const [showMockRookies, setShowMockRookies] = useState(true);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveName, setSaveName] = useState("");

  const saveMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/team-builder-saves", {
        name: saveName || `Save ${new Date().toLocaleDateString()}`,
        sport,
        state: builderState,
      });
      return response.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/team-builder-saves?sport=${sport}`] });
      toast({ title: "Saved!", description: "Team Builder state saved to history." });
      setShowSaveDialog(false);
      setSaveName("");
    },
    onError: (error: Error) => {
      toast({ title: "Save Failed", description: error.message, variant: "destructive" });
    },
  });

  const handleExport = useCallback(() => {
    const data = {
      sport,
      state: builderState,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `degen-gm-teambuilder-${sport.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exported!", description: "Team Builder state downloaded as JSON." });
  }, [builderState, sport, toast]);

  const handleImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (data.state && typeof data.state === "object") {
          setBuilderState(data.state);
          saveTeamBuilderState(data.state, sport);
          toast({ title: "Imported!", description: "Team Builder state restored from file." });
        } else {
          toast({ title: "Invalid File", description: "The file doesn't contain valid Team Builder data.", variant: "destructive" });
        }
      } catch {
        toast({ title: "Import Failed", description: "Could not read the file. Make sure it's a valid JSON export.", variant: "destructive" });
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [sport, toast]);

  useEffect(() => {
    saveTeamBuilderState(builderState, sport);
  }, [builderState, sport]);

  useEffect(() => {
    setBuilderState(loadTeamBuilderState(sport));
    setMockRookies(loadMockRookies(sport));
    setSelectedTeamCode(null);
  }, [sport]);

  const teamsMap = useMemo(() => {
    if (!teamsData) return {} as Record<string, Team>;
    const map: Record<string, Team> = {};
    teamsData.forEach(t => { map[t.code] = t; });
    return map;
  }, [teamsData]);

  const selectedTeam = selectedTeamCode ? teamsMap[selectedTeamCode] : null;
  const teamState = selectedTeamCode ? builderState[selectedTeamCode] : null;

  const signedFAs = teamState?.signedFAs || [];
  const releasedPlayerIds = teamState?.releasedPlayers || [];
  const totalFASpending = signedFAs.reduce((sum, fa) => sum + fa.marketValue, 0);
  const totalRookieSpending = useMemo(() => {
    if (!selectedTeamCode || mockRookies.length === 0) return 0;
    return mockRookies
      .filter(r => r.teamCode === selectedTeamCode)
      .reduce((sum, r) => sum + r.capHit, 0);
  }, [mockRookies, selectedTeamCode]);
  const releasedCapSavings = useMemo(() => {
    if (!rosterData || releasedPlayerIds.length === 0) return 0;
    return rosterData
      .filter(p => releasedPlayerIds.includes(p.id))
      .reduce((sum, p) => sum + (p.capHit || 0), 0);
  }, [rosterData, releasedPlayerIds]);
  const releasedPlayersData = useMemo(() => {
    if (!rosterData || releasedPlayerIds.length === 0) return [];
    return rosterData.filter(p => releasedPlayerIds.includes(p.id));
  }, [rosterData, releasedPlayerIds]);
  const originalCap = selectedTeam?.capSpace || 0;
  const updatedCap = originalCap - totalFASpending - totalRookieSpending + releasedCapSavings;

  const removedNeeds = teamState?.removedNeeds || [];
  const updatedNeeds = useMemo(() => {
    if (!selectedTeam) return [];
    return selectedTeam.needs.filter(n => !removedNeeds.includes(n));
  }, [selectedTeam, removedNeeds]);

  const teamDraftPicks = useMemo(() => {
    if (!draftOrderData || !selectedTeamCode) return [];
    return draftOrderData
      .filter(d => d.teamCode === selectedTeamCode)
      .sort((a, b) => a.pickNumber - b.pickNumber);
  }, [draftOrderData, selectedTeamCode]);

  const teamMockRookies = useMemo(() => {
    if (!selectedTeamCode || mockRookies.length === 0) return [];
    return mockRookies.filter(r => r.teamCode === selectedTeamCode);
  }, [mockRookies, selectedTeamCode]);

  const teamRosterBase = useMemo(() => {
    if (!rosterData || !selectedTeamCode) return [];
    return rosterData
      .filter(p => p.teamCode === selectedTeamCode && !releasedPlayerIds.includes(p.id))
      .sort((a, b) => a.depthOrder - b.depthOrder);
  }, [rosterData, selectedTeamCode, releasedPlayerIds]);

  const teamRoster = useMemo(() => {
    const salaryYears = Object.keys(teamMockRookies[0]?.salaryByYear || {}).map(Number).sort();
    const startYear = salaryYears[0] || 2026;
    const rookieAsRoster: RosterPlayer[] = teamMockRookies.map((r, i) => ({
      id: -1000 - i,
      teamCode: r.teamCode,
      name: r.name,
      position: r.position,
      depthOrder: 99 + i,
      age: 22,
      capHit: r.capHit,
      contractYears: r.contractYears,
      status: "active",
      sport: r.sport,
      salaryByYear: r.salaryByYear,
      contractEndYear: startYear + r.contractYears - 1,
      optionType: "none",
      freeAgentType: null,
      noTradeClause: false,
    }));
    return [...teamRosterBase, ...rookieAsRoster];
  }, [teamRosterBase, teamMockRookies]);

  const rosterByPosition = useMemo(() => {
    const map: Record<string, RosterPlayer[]> = {};
    teamRoster.forEach(p => {
      if (!map[p.position]) map[p.position] = [];
      map[p.position].push(p);
    });
    return map;
  }, [teamRoster]);

  const totalCapOnBooks = useMemo(() => {
    return teamRoster.reduce((sum, p) => sum + (p.capHit || 0), 0);
  }, [teamRoster]);

  const expiringContracts = useMemo(() => {
    return teamRoster.filter(p => p.contractYears === 1);
  }, [teamRoster]);

  const allSignedFAIds = useMemo(() => {
    const ids = new Set<number>();
    Object.values(builderState).forEach(ts => {
      ts.signedFAs.forEach(fa => ids.add(fa.id));
    });
    return ids;
  }, [builderState]);

  const availableFAs = useMemo(() => {
    if (!freeAgentsData) return [];
    return freeAgentsData.filter(fa => !allSignedFAIds.has(fa.id));
  }, [freeAgentsData, allSignedFAIds]);

  const filteredFAs = useMemo(() => {
    let list = availableFAs;
    if (posFilter !== "ALL") list = list.filter(fa => fa.position === posFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(fa => fa.name.toLowerCase().includes(q) || fa.prevTeam.toLowerCase().includes(q));
    }
    return list;
  }, [availableFAs, posFilter, searchQuery]);

  const faPositions = useMemo(() => {
    if (!freeAgentsData) return [];
    return Array.from(new Set(freeAgentsData.map(fa => fa.position))).sort();
  }, [freeAgentsData]);

  const scrapeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/nba-stats/scrape");
      return res.json();
    },
    onSuccess: (data: { count: number }) => {
      refetchNbaStats();
      toast({ title: "Stats Updated", description: `Refreshed stats for ${data.count} NBA players.` });
    },
    onError: (err: Error) => {
      toast({ title: "Scrape Failed", description: err.message, variant: "destructive" });
    },
  });

  const teamNbaStats = useMemo(() => {
    if (!nbaStatsData || !selectedTeamCode || sport !== "NBA") return [];
    return nbaStatsData.filter(s => s.teamCode === selectedTeamCode);
  }, [nbaStatsData, selectedTeamCode, sport]);

  const posNeedMap: Record<string, string[]> = sport === "NFL"
    ? {
        QB: ['QB'], RB: ['RB'], WR: ['WR'], TE: ['TE'],
        OT: ['OT', 'OL'], OL: ['OL', 'OT'], G: ['OL'],
        DT: ['DT', 'DL'], DL: ['DL', 'DT'], EDGE: ['EDGE', 'DL'],
        LB: ['LB'], CB: ['CB', 'DB'], S: ['S', 'DB'],
      }
    : {
        PG: ['PG'], SG: ['SG'], SF: ['SF'], PF: ['PF'], C: ['C'],
      };

  const signFreeAgent = useCallback((fa: FreeAgent) => {
    if (!selectedTeamCode) return;
    setBuilderState(prev => {
      const ts = prev[selectedTeamCode] || { signedFAs: [], removedNeeds: [], releasedPlayers: [] };
      const newSignedFAs = [...ts.signedFAs, fa];
      const faNeeds = posNeedMap[fa.position] || [fa.position];
      const newRemovedNeeds = [...ts.removedNeeds];
      if (selectedTeam) {
        for (const need of selectedTeam.needs) {
          if (faNeeds.includes(need) && !newRemovedNeeds.includes(need)) {
            newRemovedNeeds.push(need);
            break;
          }
        }
      }
      return { ...prev, [selectedTeamCode]: { ...ts, signedFAs: newSignedFAs, removedNeeds: newRemovedNeeds } };
    });
    setConfirmFA(null);
  }, [selectedTeamCode, selectedTeam]);

  const removeFreeAgent = useCallback((faId: number) => {
    if (!selectedTeamCode) return;
    setBuilderState(prev => {
      const ts = prev[selectedTeamCode] || { signedFAs: [], removedNeeds: [], releasedPlayers: [] };
      const removedFA = ts.signedFAs.find(fa => fa.id === faId);
      const newSignedFAs = ts.signedFAs.filter(fa => fa.id !== faId);
      let newRemovedNeeds = [...ts.removedNeeds];
      if (removedFA && selectedTeam) {
        const faNeeds = posNeedMap[removedFA.position] || [removedFA.position];
        const stillCoveredByOther = newSignedFAs.some(otherFA => {
          const otherNeeds = posNeedMap[otherFA.position] || [otherFA.position];
          return faNeeds.some(n => otherNeeds.includes(n));
        });
        if (!stillCoveredByOther) {
          newRemovedNeeds = newRemovedNeeds.filter(n => !faNeeds.includes(n));
        }
      }
      return { ...prev, [selectedTeamCode]: { ...ts, signedFAs: newSignedFAs, removedNeeds: newRemovedNeeds } };
    });
  }, [selectedTeamCode, selectedTeam]);

  const releasePlayer = useCallback((playerId: number) => {
    if (!selectedTeamCode) return;
    setBuilderState(prev => {
      const ts = prev[selectedTeamCode] || { signedFAs: [], removedNeeds: [], releasedPlayers: [] };
      if (ts.releasedPlayers.includes(playerId)) return prev;
      return { ...prev, [selectedTeamCode]: { ...ts, releasedPlayers: [...ts.releasedPlayers, playerId] } };
    });
  }, [selectedTeamCode]);

  const unreleasePlayer = useCallback((playerId: number) => {
    if (!selectedTeamCode) return;
    setBuilderState(prev => {
      const ts = prev[selectedTeamCode] || { signedFAs: [], removedNeeds: [], releasedPlayers: [] };
      return { ...prev, [selectedTeamCode]: { ...ts, releasedPlayers: ts.releasedPlayers.filter(id => id !== playerId) } };
    });
  }, [selectedTeamCode]);

  const resetTeam = useCallback(() => {
    if (!selectedTeamCode) return;
    setBuilderState(prev => {
      const newState = { ...prev };
      delete newState[selectedTeamCode];
      return newState;
    });
  }, [selectedTeamCode]);

  const resetAll = useCallback(() => {
    setBuilderState({});
  }, []);

  const formatCurrency = (amount: number) => {
    return `$${Math.abs(amount).toFixed(1)}M`;
  };

  const getTierColor = (tier: string) => {
    if (tier === 'Elite') return 'text-amber-400 bg-amber-500/20 border-amber-500/30';
    if (tier === 'Premium') return 'text-purple-400 bg-purple-500/20 border-purple-500/30';
    if (tier === 'Solid') return 'text-blue-400 bg-blue-500/20 border-blue-500/30';
    return 'text-gray-400 bg-gray-500/20 border-gray-500/30';
  };

  const teamsWithChanges = useMemo(() => {
    return Object.keys(builderState).filter(code => builderState[code].signedFAs.length > 0 || (builderState[code].releasedPlayers?.length || 0) > 0);
  }, [builderState]);

  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => ({ ...prev, [group]: !prev[group] }));
  };

  const isLoading = teamsLoading || faLoading;

  if (isLoading) {
    return (
      <Layout>
        <div className="h-[calc(100vh-8rem)] flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-muted-foreground text-lg">Loading team data...</p>
          </div>
        </div>
      </Layout>
    );
  }

  const renderPositionGroup = (positions: string[], label: string, groupKey: string) => {
    const hasPlayers = positions.some(pos => rosterByPosition[pos]?.length);
    if (!hasPlayers) return null;
    const isExpanded = expandedGroups[groupKey];

    return (
      <div key={groupKey}>
        <button
          onClick={() => toggleGroup(groupKey)}
          className="w-full flex items-center gap-2 py-2 px-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
          data-testid={`button-toggle-${groupKey}`}
        >
          <ChevronRight className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-90")} />
          <span className="text-xs font-bold uppercase tracking-wider">{label}</span>
          <span className="text-[10px] text-muted-foreground ml-auto">
            {positions.reduce((sum, pos) => sum + (rosterByPosition[pos]?.length || 0), 0)} players
          </span>
        </button>
        {isExpanded && (
          <div className="mt-1 space-y-0.5">
            {positions.map(pos => {
              const players = rosterByPosition[pos];
              if (!players?.length) return null;
              const isNeed = updatedNeeds.includes(pos);
              return (
                <div key={pos}>
                  {players.map((p, i) => (
                    <div
                      key={p.id}
                      className={cn(
                        "flex items-center gap-2 px-2 sm:px-3 py-1.5 text-sm group",
                        i === 0 && "border-t border-border/20 mt-1",
                        p.depthOrder === 1 ? "opacity-100" : "opacity-60",
                        isNeed && p.depthOrder === 1 && "bg-red-500/5",
                      )}
                      data-testid={`roster-player-${p.id}`}
                    >
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[9px] h-4 px-1 font-mono shrink-0",
                          isNeed && p.depthOrder === 1 && "border-red-500/50 text-red-400",
                        )}
                      >
                        {pos}
                      </Badge>
                      <div className="flex-1 min-w-0 font-medium truncate flex items-center gap-1.5">
                        <span className="truncate">{p.name}</span>
                        {p.depthOrder > 1 && (
                          <span className="text-[9px] text-muted-foreground shrink-0">({getDepthLabel(p.depthOrder)})</span>
                        )}
                        {p.id < -999 && (
                          <Badge className="text-[8px] h-3.5 px-1 bg-emerald-500/20 text-emerald-400 border-emerald-500/30 shrink-0">ROOK</Badge>
                        )}
                        {p.status === "injured" && (
                          <Badge className="text-[8px] h-3.5 px-1 bg-red-500/20 text-red-400 border-red-500/30 shrink-0">IR</Badge>
                        )}
                        {p.status === "franchise_tag" && (
                          <Badge className="text-[8px] h-3.5 px-1 bg-amber-500/20 text-amber-400 border-amber-500/30 shrink-0">TAG</Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground hidden sm:inline shrink-0">{p.age}</span>
                      <span className="text-xs font-mono text-primary shrink-0">
                        {p.capHit != null ? formatCurrency(p.capHit) : ''}
                      </span>
                      <span className={cn("text-xs font-mono shrink-0 hidden sm:inline", getContractColor(p.contractYears))}>
                        {p.contractYears != null ? `${p.contractYears}yr${p.contractYears !== 1 ? 's' : ''}` : ''}
                      </span>
                      {p.id > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                          onClick={() => releasePlayer(p.id)}
                          title="Release player"
                          data-testid={`button-release-${p.id}`}
                        >
                          <Scissors className="h-3 w-3 text-red-400" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <Layout>
      <div className="lg:h-[calc(100vh-8rem)] flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl sm:text-3xl font-display font-bold">Team Builder</h2>
            <p className="text-sm sm:text-base text-muted-foreground">Explore depth charts, contracts, sign free agents, then launch a mock draft.</p>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            {teamsWithChanges.length > 0 && (
              <Badge variant="secondary" className="text-xs" data-testid="badge-teams-modified">
                {teamsWithChanges.length} team{teamsWithChanges.length !== 1 ? 's' : ''} modified
              </Badge>
            )}
            {teamsWithChanges.length > 0 && (
              <Button variant="outline" size="sm" onClick={() => setShowSaveDialog(true)} className="gap-1.5" data-testid="button-save-tb">
                <Save className="h-3.5 w-3.5" /><span className="hidden sm:inline"> Save</span>
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5" data-testid="button-export-tb">
              <Download className="h-3.5 w-3.5" /><span className="hidden sm:inline"> Export</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="gap-1.5" data-testid="button-import-tb">
              <Upload className="h-3.5 w-3.5" /><span className="hidden sm:inline"> Import</span>
            </Button>
            <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
            {teamsWithChanges.length > 0 && (
              <Button variant="outline" size="sm" onClick={resetAll} className="gap-1.5" data-testid="button-reset-all">
                <RotateCcw className="h-3.5 w-3.5" /><span className="hidden sm:inline"> Reset All</span>
              </Button>
            )}
            <Button onClick={() => navigate('/mock-draft')} className="gap-2" data-testid="button-start-mock">
              <Play className="h-4 w-4" /> <span className="hidden sm:inline">Start</span> Mock Draft
            </Button>
          </div>
        </div>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0 overflow-auto lg:overflow-hidden">
          <div className="lg:col-span-4 flex flex-col gap-4 min-h-0">
            <Card className="border-border/50 bg-card/50">
              <CardHeader className="py-3 px-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Select Team</CardTitle>
                  {selectedTeam && (
                    <Button variant="ghost" size="sm" onClick={() => setShowTeamPicker(true)} className="text-xs" data-testid="button-change-team">
                      Change
                    </Button>
                  )}
                </div>
              </CardHeader>
              {!selectedTeam ? (
                <CardContent className="py-6">
                  <div className="grid grid-cols-4 gap-2">
                    {teamsData?.sort((a, b) => a.name.localeCompare(b.name)).map(team => (
                      <button
                        key={team.code}
                        onClick={() => setSelectedTeamCode(team.code)}
                        className={cn(
                          "flex flex-col items-center gap-1 p-2 rounded-lg border transition-all hover:scale-105",
                          (builderState[team.code]?.signedFAs?.length || builderState[team.code]?.releasedPlayers?.length)
                            ? "border-primary/50 bg-primary/10"
                            : "border-border/50 hover:border-border hover:bg-muted/50"
                        )}
                        data-testid={`button-select-team-${team.code}`}
                      >
                        <div
                          className="h-8 w-8 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                          style={{ backgroundColor: team.primaryColor }}
                        >
                          {team.code}
                        </div>
                        <span className="text-[10px] text-muted-foreground truncate w-full text-center">{team.name.split(' ').pop()}</span>
                        {(builderState[team.code]?.signedFAs?.length > 0 || builderState[team.code]?.releasedPlayers?.length > 0) && (
                          <Badge className="text-[8px] h-3.5 px-1 bg-primary/20 text-primary border-primary/30">
                            {[
                              builderState[team.code]?.signedFAs?.length > 0 ? `${builderState[team.code].signedFAs.length} FA` : null,
                              builderState[team.code]?.releasedPlayers?.length > 0 ? `${builderState[team.code].releasedPlayers.length} cut` : null,
                            ].filter(Boolean).join(' · ')}
                          </Badge>
                        )}
                      </button>
                    ))}
                  </div>
                </CardContent>
              ) : (
                <CardContent className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-14 w-14 rounded-full flex items-center justify-center text-lg font-bold text-white shadow-lg"
                      style={{ backgroundColor: selectedTeam.primaryColor }}
                    >
                      {selectedTeamCode}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl font-display font-bold" data-testid="text-selected-team">{selectedTeam.name}</h3>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>

            {selectedTeam && (
              <Card className="flex-1 flex flex-col min-h-0 border-border/50 bg-card/50">
                <CardHeader className="py-3 px-4 border-b border-border">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Team Profile</CardTitle>
                    {(signedFAs.length > 0 || releasedPlayerIds.length > 0) && (
                      <Button variant="ghost" size="sm" onClick={resetTeam} className="text-xs gap-1 h-7" data-testid="button-reset-team">
                        <RotateCcw className="h-3 w-3" /> Reset
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <ScrollArea className="flex-1">
                  <div className="p-4 space-y-4">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                        <Target className="h-3.5 w-3.5" /> Remaining Needs
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {updatedNeeds.length > 0 ? updatedNeeds.map(need => (
                          <Badge key={need} variant="secondary" className="text-xs font-mono">{need}</Badge>
                        )) : (
                          <div className="flex items-center gap-1.5 text-emerald-400 text-sm">
                            <CheckCircle2 className="h-4 w-4" /> All needs addressed!
                          </div>
                        )}
                      </div>
                      {removedNeeds.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {removedNeeds.map(need => (
                            <Badge key={need} className="text-[10px] bg-emerald-500/20 text-emerald-400 border-emerald-500/30 line-through opacity-60">{need}</Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    <Separator />

                    {teamRoster.length > 0 && (
                      <>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-muted/30 rounded-lg p-2.5 border border-border/30">
                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Cap Committed</div>
                            <div className="text-sm font-mono font-bold text-primary">{formatCurrency(totalCapOnBooks)}</div>
                          </div>
                          <div className="bg-muted/30 rounded-lg p-2.5 border border-border/30">
                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Expiring</div>
                            <div className="text-sm font-mono font-bold text-red-400">{expiringContracts.length} players</div>
                          </div>
                        </div>
                        <Separator />
                      </>
                    )}

                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                        <Shield className="h-3.5 w-3.5" /> Draft Picks
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {teamDraftPicks.map(pick => (
                          <Badge key={pick.id} variant="outline" className="text-xs font-mono">
                            R{pick.round} #{pick.pickNumber}
                          </Badge>
                        ))}
                        {teamDraftPicks.length === 0 && (
                          <span className="text-sm text-muted-foreground italic">No picks found</span>
                        )}
                      </div>
                    </div>

                    {mockRookies.length > 0 && (
                      <>
                        <Separator />
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                              <GraduationCap className="h-3.5 w-3.5" /> Mock Draft Rookies
                            </h4>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowMockRookies(!showMockRookies)}
                                className="text-[10px] h-6 px-2"
                                data-testid="button-toggle-rookies"
                              >
                                {showMockRookies ? "Hide" : "Show"}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => { clearMockRookies(sport); setMockRookies([]); }}
                                className="text-[10px] h-6 px-2 text-red-400 hover:text-red-300"
                                data-testid="button-clear-rookies"
                              >
                                Clear
                              </Button>
                            </div>
                          </div>
                          {showMockRookies && (
                            <div className="space-y-1.5">
                              {teamMockRookies.length > 0 ? teamMockRookies.map(r => (
                                <div key={r.name} className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-1.5">
                                  <div className="flex items-center gap-2">
                                    <Badge className="bg-emerald-500/30 text-emerald-300 border-emerald-500/40 text-[10px]">R{r.round}#{r.overallPick}</Badge>
                                    <span className="text-sm font-medium">{r.name}</span>
                                    <span className="text-xs text-muted-foreground">{r.position}</span>
                                  </div>
                                  <span className="text-xs font-mono text-emerald-400">{formatCurrency(r.capHit)}</span>
                                </div>
                              )) : (
                                <span className="text-xs text-muted-foreground italic">No rookies drafted for this team</span>
                              )}
                              {mockRookies.length > 0 && !selectedTeamCode && (
                                <span className="text-xs text-muted-foreground italic">Select a team to see drafted rookies</span>
                              )}
                            </div>
                          )}
                        </div>
                      </>
                    )}

                    <Separator />

                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5" /> Signed Free Agents ({signedFAs.length})
                      </h4>
                      {signedFAs.length > 0 ? (
                        <div className="space-y-1.5">
                          <AnimatePresence>
                            {signedFAs.map(fa => (
                              <motion.div
                                key={fa.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="flex items-center gap-2 bg-muted/40 rounded-lg px-3 py-2 border border-border/30 group"
                              >
                                <Badge variant="secondary" className="text-[10px] font-mono h-5 px-1.5 shrink-0">{fa.position}</Badge>
                                <span className="text-sm font-medium flex-1 truncate">{fa.name}</span>
                                <span className="text-xs text-muted-foreground font-mono shrink-0">{formatCurrency(fa.marketValue)}</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                  onClick={() => removeFreeAgent(fa.id)}
                                  data-testid={`button-remove-fa-${fa.id}`}
                                >
                                  <X className="h-3 w-3 text-red-400" />
                                </Button>
                              </motion.div>
                            ))}
                          </AnimatePresence>
                          <div className="flex items-center justify-between text-xs pt-1 border-t border-border/30 mt-2">
                            <span className="text-muted-foreground">Total Spending</span>
                            <span className="font-mono font-bold text-primary">{formatCurrency(totalFASpending)}</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">No free agents signed yet.</p>
                      )}
                    </div>

                    {releasedPlayersData.length > 0 && (
                      <>
                        <Separator />
                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                            <Scissors className="h-3.5 w-3.5" /> Released Players ({releasedPlayersData.length})
                          </h4>
                          <div className="space-y-1.5">
                            <AnimatePresence>
                              {releasedPlayersData.map(p => (
                                <motion.div
                                  key={p.id}
                                  initial={{ opacity: 0, x: -20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  exit={{ opacity: 0, x: 20 }}
                                  className="flex items-center gap-2 bg-red-500/10 rounded-lg px-3 py-2 border border-red-500/20 group"
                                >
                                  <Badge variant="secondary" className="text-[10px] font-mono h-5 px-1.5 shrink-0">{p.position}</Badge>
                                  <span className="text-sm font-medium flex-1 truncate line-through opacity-70">{p.name}</span>
                                  <span className="text-xs text-emerald-400 font-mono shrink-0">+{formatCurrency(p.capHit || 0)}</span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                    onClick={() => unreleasePlayer(p.id)}
                                    title="Re-sign player"
                                    data-testid={`button-unrelease-${p.id}`}
                                  >
                                    <Undo2 className="h-3 w-3 text-blue-400" />
                                  </Button>
                                </motion.div>
                              ))}
                            </AnimatePresence>
                            <div className="flex items-center justify-between text-xs pt-1 border-t border-border/30 mt-2">
                              <span className="text-muted-foreground">Cap Savings</span>
                              <span className="font-mono font-bold text-emerald-400">+{formatCurrency(releasedCapSavings)}</span>
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    {updatedCap < 0 && (
                      <>
                        <Separator />
                        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                          <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
                          <p className="text-xs text-red-400">Over the salary cap by {formatCurrency(Math.abs(updatedCap))}.</p>
                        </div>
                      </>
                    )}
                  </div>
                </ScrollArea>
              </Card>
            )}
          </div>

          <Card className="lg:col-span-8 flex flex-col min-h-0 border-border/50 bg-card/50">
            <div className="flex border-b border-border">
              <button
                onClick={() => setRightTab("capSheet")}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                  rightTab === "capSheet"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
                data-testid="tab-cap-sheet"
              >
                <DollarSign className="h-4 w-4" />
                Cap Sheet
              </button>
              {sport === "NBA" && (
                <button
                  onClick={() => setRightTab("seasonStats")}
                  className={cn(
                    "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                    rightTab === "seasonStats"
                      ? "border-emerald-500 text-emerald-500"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                  data-testid="tab-season-stats"
                >
                  <Activity className="h-4 w-4" />
                  Season Stats
                </button>
              )}
              <button
                onClick={() => setRightTab("roster")}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                  rightTab === "roster"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
                data-testid="tab-roster"
              >
                <ClipboardList className="h-4 w-4" />
                Depth Chart & Contracts
              </button>
              <button
                onClick={() => setRightTab("freeAgents")}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                  rightTab === "freeAgents"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
                data-testid="tab-free-agents"
              >
                <Users className="h-4 w-4" />
                Free Agent Market
                <Badge variant="secondary" className="text-[10px] h-5">{availableFAs.length}</Badge>
              </button>
            </div>

            {rightTab === "capSheet" ? (
              selectedTeamCode && teamRoster.length > 0 ? (
                <CapSheetView
                  teamRoster={teamRoster}
                  teamName={selectedTeam?.name || ""}
                  capSpace={selectedTeam?.capSpace || 0}
                  sport={sport}
                  onReleasePlayer={releasePlayer}
                />
              ) : (
                <div className="flex-1 flex items-center justify-center text-center p-8">
                  <div className="space-y-3">
                    <DollarSign className="h-12 w-12 text-muted-foreground/50 mx-auto" />
                    <div>
                      <p className="text-muted-foreground font-medium">Select a team to view their cap sheet</p>
                      <p className="text-sm text-muted-foreground/70 mt-1">Multi-year salary projections, free agent timeline, and cap commitments</p>
                    </div>
                  </div>
                </div>
              )
            ) : rightTab === "seasonStats" ? (
              selectedTeamCode ? (
                <div className="flex flex-col flex-1 min-h-0">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
                    <div>
                      <h3 className="text-sm font-semibold flex items-center gap-2">
                        <Activity className="h-4 w-4 text-emerald-500" />
                        {selectedTeam?.name} — 2025-26 Season Averages
                      </h3>
                      <p className="text-[10px] text-muted-foreground">
                        Live per-game stats from Basketball Reference ({teamNbaStats.length} players)
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1.5"
                      onClick={() => scrapeMutation.mutate()}
                      disabled={scrapeMutation.isPending || nbaStatsFetching}
                      data-testid="button-refresh-nba-stats"
                    >
                      <RefreshCw className={cn("h-3 w-3", (scrapeMutation.isPending || nbaStatsFetching) && "animate-spin")} />
                      {scrapeMutation.isPending ? "Updating..." : "Refresh"}
                    </Button>
                  </div>
                  {teamNbaStats.length > 0 ? (
                    <div className="flex-1 overflow-auto">
                      <table className="w-full text-xs">
                        <thead className="sticky top-0 bg-card z-10">
                          <tr className="border-b border-border">
                            <th className="text-left py-2 px-2 font-medium text-muted-foreground sticky left-0 bg-card">Player</th>
                            <th className="text-center py-2 px-1.5 font-medium text-muted-foreground">Pos</th>
                            <th className="text-right py-2 px-1.5 font-medium text-muted-foreground">GP</th>
                            <th className="text-right py-2 px-1.5 font-medium text-muted-foreground">MPG</th>
                            <th className="text-right py-2 px-1.5 font-medium text-emerald-400">PPG</th>
                            <th className="text-right py-2 px-1.5 font-medium text-muted-foreground">RPG</th>
                            <th className="text-right py-2 px-1.5 font-medium text-muted-foreground">APG</th>
                            <th className="text-right py-2 px-1.5 font-medium text-muted-foreground">SPG</th>
                            <th className="text-right py-2 px-1.5 font-medium text-muted-foreground">BPG</th>
                            <th className="text-right py-2 px-1.5 font-medium text-muted-foreground">FG%</th>
                            <th className="text-right py-2 px-1.5 font-medium text-muted-foreground">3P%</th>
                            <th className="text-right py-2 px-1.5 font-medium text-muted-foreground">FT%</th>
                            <th className="text-right py-2 px-1.5 font-medium text-muted-foreground">TOV</th>
                          </tr>
                        </thead>
                        <tbody>
                          {teamNbaStats
                            .sort((a, b) => (b.pointsPerGame ?? 0) - (a.pointsPerGame ?? 0))
                            .map((s, i) => (
                              <tr
                                key={`${s.name}-${i}`}
                                className={cn(
                                  "border-b border-border/30 transition-colors hover:bg-muted/40",
                                  i % 2 === 0 && "bg-muted/10"
                                )}
                                data-testid={`row-nba-stat-${i}`}
                              >
                                <td className="py-2 px-2 font-medium whitespace-nowrap sticky left-0 bg-inherit">
                                  {s.name}
                                </td>
                                <td className="text-center py-2 px-1.5">
                                  <Badge variant="outline" className="text-[9px] h-4 px-1 font-mono">
                                    {s.position}
                                  </Badge>
                                </td>
                                <td className="text-right py-2 px-1.5 font-mono text-muted-foreground">{s.gamesPlayed ?? "—"}</td>
                                <td className="text-right py-2 px-1.5 font-mono text-muted-foreground">{s.minutesPerGame != null ? Number(s.minutesPerGame).toFixed(1) : "—"}</td>
                                <td className="text-right py-2 px-1.5 font-mono font-semibold text-emerald-400">{s.pointsPerGame != null ? Number(s.pointsPerGame).toFixed(1) : "—"}</td>
                                <td className="text-right py-2 px-1.5 font-mono">{s.reboundsPerGame != null ? Number(s.reboundsPerGame).toFixed(1) : "—"}</td>
                                <td className="text-right py-2 px-1.5 font-mono">{s.assistsPerGame != null ? Number(s.assistsPerGame).toFixed(1) : "—"}</td>
                                <td className="text-right py-2 px-1.5 font-mono">{s.stealsPerGame != null ? Number(s.stealsPerGame).toFixed(1) : "—"}</td>
                                <td className="text-right py-2 px-1.5 font-mono">{s.blocksPerGame != null ? Number(s.blocksPerGame).toFixed(1) : "—"}</td>
                                <td className="text-right py-2 px-1.5 font-mono">{s.fgPct != null ? `${(Number(s.fgPct) * 100).toFixed(1)}` : "—"}</td>
                                <td className="text-right py-2 px-1.5 font-mono">{s.fg3Pct != null ? `${(Number(s.fg3Pct) * 100).toFixed(1)}` : "—"}</td>
                                <td className="text-right py-2 px-1.5 font-mono">{s.ftPct != null ? `${(Number(s.ftPct) * 100).toFixed(1)}` : "—"}</td>
                                <td className="text-right py-2 px-1.5 font-mono text-muted-foreground">{s.turnoversPerGame != null ? Number(s.turnoversPerGame).toFixed(1) : "—"}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-center p-8">
                      <div className="space-y-3">
                        <Activity className="h-12 w-12 text-muted-foreground/50 mx-auto" />
                        <div>
                          <p className="text-muted-foreground font-medium">No season stats loaded yet</p>
                          <p className="text-sm text-muted-foreground/70 mt-1">Click "Refresh" to fetch live stats from Basketball Reference</p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => scrapeMutation.mutate()}
                          disabled={scrapeMutation.isPending}
                          data-testid="button-load-nba-stats"
                        >
                          <RefreshCw className={cn("h-4 w-4 mr-2", scrapeMutation.isPending && "animate-spin")} />
                          {scrapeMutation.isPending ? "Loading..." : "Load Season Stats"}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-center p-8">
                  <div className="space-y-3">
                    <Activity className="h-12 w-12 text-muted-foreground/50 mx-auto" />
                    <div>
                      <p className="text-muted-foreground font-medium">Select a team to view their season stats</p>
                      <p className="text-sm text-muted-foreground/70 mt-1">Live per-game averages for every player on the roster</p>
                    </div>
                  </div>
                </div>
              )
            ) : rightTab === "roster" ? (
              <>
                {selectedTeamCode && teamRoster.length > 0 ? (
                  <>
                    <div className="flex items-center gap-2 px-2 sm:px-3 py-2 bg-muted/30 text-[10px] font-medium text-muted-foreground uppercase tracking-wider border-b border-border">
                      <span className="w-8 shrink-0">Pos</span>
                      <span className="flex-1">Player</span>
                      <span className="hidden sm:inline shrink-0 w-8">Age</span>
                      <span className="shrink-0 text-right w-14">Cap</span>
                      <span className="hidden sm:inline shrink-0 text-right w-10">Yrs</span>
                    </div>
                    <ScrollArea className="flex-1">
                      <div className="p-2 space-y-2">
                        {renderPositionGroup(OFFENSE_POSITIONS, "Offense", "offense")}
                        {renderPositionGroup(DEFENSE_POSITIONS, "Defense", "defense")}
                        {renderPositionGroup(SPECIAL_POSITIONS, "Special Teams", "special")}

                        {expiringContracts.length > 0 && (
                          <div className="mt-4 border-t border-border pt-3">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-red-400 mb-2 px-3 flex items-center gap-1.5">
                              <AlertTriangle className="h-3.5 w-3.5" /> Expiring Contracts ({expiringContracts.length})
                            </h4>
                            <div className="space-y-0.5">
                              {expiringContracts.map(p => (
                                <div key={p.id} className="flex items-center gap-2 px-2 sm:px-3 py-1.5 text-sm bg-red-500/5 rounded">
                                  <Badge variant="outline" className="text-[9px] h-4 px-1 font-mono border-red-500/30 text-red-400 shrink-0">{p.position}</Badge>
                                  <span className="flex-1 min-w-0 font-medium truncate">{p.name}</span>
                                  <span className="text-xs text-muted-foreground hidden sm:inline shrink-0">{p.age}</span>
                                  <span className="text-xs font-mono text-primary shrink-0">{p.capHit != null ? formatCurrency(p.capHit) : '—'}</span>
                                  <Badge className="text-[9px] bg-red-500/20 text-red-400 border-red-500/30 shrink-0 hidden sm:inline-flex">Final Year</Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-center p-8">
                    <div className="space-y-3">
                      <ClipboardList className="h-12 w-12 text-muted-foreground/50 mx-auto" />
                      <div>
                        <p className="text-muted-foreground font-medium">Select a team to view their depth chart</p>
                        <p className="text-sm text-muted-foreground/70 mt-1">See current starters, backups, contract details, and expiring deals</p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <CardHeader className="py-3 px-4 border-b border-border space-y-3">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search free agents..."
                        className="pl-8"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        data-testid="input-search-fa"
                      />
                    </div>
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    <Button
                      variant={posFilter === "ALL" ? "default" : "ghost"}
                      size="sm"
                      className="h-6 text-[10px] px-2"
                      onClick={() => setPosFilter("ALL")}
                    >
                      ALL
                    </Button>
                    {faPositions.map(pos => (
                      <Button
                        key={pos}
                        variant={posFilter === pos ? "default" : "ghost"}
                        size="sm"
                        className="h-6 text-[10px] px-2"
                        onClick={() => setPosFilter(pos)}
                        data-testid={`button-fa-pos-${pos}`}
                      >
                        {pos}
                      </Button>
                    ))}
                  </div>
                </CardHeader>

                <ScrollArea className="flex-1">
                  <div className="divide-y divide-border/50">
                    {filteredFAs.map(fa => {
                      const faNeeds = posNeedMap[fa.position] || [fa.position];
                      const fillsNeed = selectedTeam ? updatedNeeds.some(n => faNeeds.includes(n)) : false;
                      const canAfford = selectedTeam ? (updatedCap - fa.marketValue) >= -20 : true;

                      return (
                        <div
                          key={fa.id}
                          className={cn(
                            "flex items-center gap-2 px-3 sm:px-4 py-2.5 transition-colors",
                            fillsNeed && "bg-green-500/5",
                          )}
                          data-testid={`row-fa-${fa.id}`}
                        >
                          <Badge variant="secondary" className="text-[10px] font-mono shrink-0">{fa.position}</Badge>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate flex items-center gap-1.5">
                              {fa.name}
                              {fillsNeed && (
                                <Badge className="text-[8px] h-3.5 px-1 bg-green-500/20 text-green-400 border-green-500/30 shrink-0">
                                  NEED
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">{fa.prevTeam} · Age {fa.age}</div>
                          </div>
                          <span className="text-sm font-mono text-primary shrink-0">{formatCurrency(fa.marketValue)}</span>
                          <Badge className={cn("text-[9px] border shrink-0 hidden sm:inline-flex", getTierColor(fa.tier))}>
                            {fa.tier}
                          </Badge>
                          <div className="shrink-0">
                            {selectedTeam ? (
                              <Button
                                size="sm"
                                variant={fillsNeed ? "default" : "outline"}
                                className="h-7 text-xs gap-1"
                                onClick={() => setConfirmFA(fa)}
                                disabled={!canAfford}
                                data-testid={`button-sign-fa-${fa.id}`}
                              >
                                <Plus className="h-3 w-3" /> <span className="hidden sm:inline">Sign</span>
                              </Button>
                            ) : (
                              <span className="text-xs text-muted-foreground italic hidden sm:inline">Select team</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {filteredFAs.length === 0 && (
                      <div className="py-8 text-center text-muted-foreground">
                        No matching free agents found.
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </>
            )}
          </Card>
        </div>
      </div>

      <Dialog open={showTeamPicker} onOpenChange={setShowTeamPicker}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Select Team</DialogTitle>
            <DialogDescription>Choose a team to manage</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-3 py-4">
            {teamsData?.sort((a, b) => a.name.localeCompare(b.name)).map(team => (
              <button
                key={team.code}
                onClick={() => { setSelectedTeamCode(team.code); setShowTeamPicker(false); }}
                className={cn(
                  "flex flex-col items-center gap-2 p-3 rounded-lg border transition-all hover:scale-105",
                  selectedTeamCode === team.code
                    ? "border-primary bg-primary/10"
                    : "border-border/50 hover:border-border hover:bg-muted/50"
                )}
              >
                <div
                  className="h-10 w-10 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ backgroundColor: team.primaryColor }}
                >
                  {team.code}
                </div>
                <span className="text-xs text-center">{team.name}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmFA} onOpenChange={() => setConfirmFA(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Signing</DialogTitle>
            <DialogDescription>
              Sign {confirmFA?.name} ({confirmFA?.position}) for {confirmFA ? formatCurrency(confirmFA.marketValue) : ''}?
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Current Cap Space</span>
              <span className="font-mono">{formatCurrency(updatedCap)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">After Signing</span>
              <span className={cn("font-mono font-bold",
                confirmFA && (updatedCap - confirmFA.marketValue) > 0 ? "text-emerald-400" : "text-red-400"
              )}>
                {confirmFA ? formatCurrency(updatedCap - confirmFA.marketValue) : ''}
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmFA(null)}>Cancel</Button>
            <Button onClick={() => confirmFA && signFreeAgent(confirmFA)} data-testid="button-confirm-sign">
              Sign Player
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Save className="h-5 w-5" />
              Save Team Builder
            </DialogTitle>
            <DialogDescription>
              Save your current progress so you can restore it later from History.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Input
              placeholder="Give this save a name..."
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              data-testid="input-save-name"
            />
            <p className="text-xs text-muted-foreground mt-2">
              {teamsWithChanges.length} team{teamsWithChanges.length !== 1 ? 's' : ''} with changes will be saved.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>Cancel</Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              data-testid="button-confirm-save"
            >
              {saveMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

const CURRENT_YEAR = 2025;
const PROJECTION_YEARS = 5;
const SALARY_RAISE_PCT = 0.05;

function getPlayerSalaryForYear(player: RosterPlayer, yearOffset: number): number | null {
  const contractYears = player.contractYears || 1;
  if (yearOffset >= contractYears) return null;

  const salaryByYear = player.salaryByYear as Record<string, number> | null;
  if (salaryByYear) {
    const yearKey = String(CURRENT_YEAR + yearOffset);
    if (salaryByYear[yearKey] !== undefined) return salaryByYear[yearKey];
  }

  const capHit = player.capHit || 0;
  if (yearOffset === 0) return capHit;
  return Math.round(capHit * Math.pow(1 + SALARY_RAISE_PCT, yearOffset) * 10) / 10;
}

function CapSheetView({ teamRoster, teamName, capSpace, sport, onReleasePlayer }: {
  teamRoster: RosterPlayer[];
  teamName: string;
  capSpace: number;
  sport: string;
  onReleasePlayer?: (playerId: number) => void;
}) {
  const [sortBy, setSortBy] = useState<"salary" | "name" | "position">("salary");
  const [showExpiredOnly, setShowExpiredOnly] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<RosterPlayer | null>(null);

  const years = Array.from({ length: PROJECTION_YEARS }, (_, i) => CURRENT_YEAR + i);

  const capDefaults: Record<number, number> = {
    2025: 140.6, 2026: 148.1, 2027: 155.0, 2028: 162.8, 2029: 170.9,
  };

  const sortedRoster = useMemo(() => {
    const sorted = [...teamRoster];
    if (sortBy === "salary") sorted.sort((a, b) => (b.capHit || 0) - (a.capHit || 0));
    else if (sortBy === "name") sorted.sort((a, b) => a.name.localeCompare(b.name));
    else sorted.sort((a, b) => a.position.localeCompare(b.position) || (b.capHit || 0) - (a.capHit || 0));
    return sorted;
  }, [teamRoster, sortBy]);

  const yearTotals = useMemo(() => {
    return years.map((year, yi) => {
      let total = 0;
      let playerCount = 0;
      sortedRoster.forEach(p => {
        const projected = getPlayerSalaryForYear(p, yi);
        if (projected !== null) {
          total += projected;
          playerCount++;
        }
      });
      return { year, total: Math.round(total * 10) / 10, playerCount, cap: capDefaults[year] || 179.4 };
    });
  }, [sortedRoster, years]);

  const faByYear = useMemo(() => {
    const map: Record<number, RosterPlayer[]> = {};
    sortedRoster.forEach(p => {
      const faYear = CURRENT_YEAR + (p.contractYears || 1) - 1;
      if (!map[faYear]) map[faYear] = [];
      map[faYear].push(p);
    });
    return map;
  }, [sortedRoster]);

  const formatCurrency = (amount: number) => `$${Math.abs(amount).toFixed(1)}M`;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 border-b border-border flex-wrap">
        <span className="text-xs text-muted-foreground">Sort:</span>
        {(["salary", "name", "position"] as const).map(s => (
          <Button
            key={s}
            variant={sortBy === s ? "default" : "ghost"}
            size="sm"
            className="h-6 text-[10px] px-2"
            onClick={() => setSortBy(s)}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </Button>
        ))}
      </div>

      <div className="bg-muted/20 px-3 py-2 border-b border-border overflow-x-auto">
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${PROJECTION_YEARS}, 1fr)`, minWidth: 400 }}>
          {yearTotals.map(yt => (
            <div key={yt.year} className="text-center">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {yt.year}-{(yt.year + 1).toString().slice(-2)}
              </div>
              <div className={cn(
                "text-xs font-mono font-bold",
                yt.total > yt.cap ? "text-red-400" : "text-emerald-400"
              )}>
                {formatCurrency(yt.total)}
              </div>
              <div className="text-[9px] text-muted-foreground">
                {yt.playerCount} players · Cap {formatCurrency(yt.cap)}
              </div>
              <div className={cn(
                "text-[9px] font-mono",
                (yt.cap - yt.total) > 0 ? "text-emerald-400" : "text-red-400"
              )}>
                {(yt.cap - yt.total) > 0 ? "+" : ""}{formatCurrency(yt.cap - yt.total)} space
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="min-w-[600px]">
          <div className="flex items-center gap-1 px-2 py-1.5 bg-muted/30 text-[9px] font-medium text-muted-foreground uppercase tracking-wider border-b border-border sticky top-0 z-10">
            <span className="w-7 shrink-0">Pos</span>
            <span className="flex-1 min-w-[120px]">Player</span>
            <span className="w-8 text-center shrink-0">Age</span>
            {years.map(y => (
              <span key={y} className="w-14 text-right shrink-0">{y.toString().slice(-2)}-{(y + 1).toString().slice(-2)}</span>
            ))}
            <span className="w-8 text-center shrink-0">FA</span>
          </div>

          {sortedRoster.map(p => {
            const faYear = CURRENT_YEAR + (p.contractYears || 1) - 1;
            return (
              <div
                key={p.id}
                className="flex items-center gap-1 px-2 py-1 text-xs border-b border-border/20 hover:bg-muted/20 group cursor-pointer"
                onClick={() => setSelectedPlayer(p)}
                data-testid={`capsheet-player-${p.id}`}
              >
                <Badge variant="outline" className="text-[8px] h-4 px-1 font-mono shrink-0 w-7 justify-center">{p.position}</Badge>
                <div className="flex-1 min-w-[120px] truncate font-medium flex items-center gap-1">
                  <span className="truncate">{p.name}</span>
                  {p.id < -999 && <Badge className="text-[7px] h-3 px-0.5 bg-emerald-500/20 text-emerald-400 border-emerald-500/30">ROOK</Badge>}
                  {p.noTradeClause && <Badge className="text-[7px] h-3 px-0.5 bg-amber-500/20 text-amber-400">NTC</Badge>}
                </div>
                <span className="w-8 text-center text-muted-foreground shrink-0">{p.age}</span>
                {years.map((y, yi) => {
                  const projected = getPlayerSalaryForYear(p, yi);
                  const isLastYear = yi === (p.contractYears || 1) - 1;
                  return (
                    <span
                      key={y}
                      className={cn(
                        "w-14 text-right font-mono shrink-0",
                        projected === null ? "text-muted-foreground/30" : isLastYear ? "text-red-400" : "text-foreground"
                      )}
                    >
                      {projected !== null ? formatCurrency(projected) : "—"}
                    </span>
                  );
                })}
                <span className={cn(
                  "w-8 text-center font-mono shrink-0 text-[10px]",
                  faYear === CURRENT_YEAR ? "text-red-400 font-bold" : faYear === CURRENT_YEAR + 1 ? "text-yellow-400" : "text-muted-foreground"
                )}>
                  {faYear <= CURRENT_YEAR + PROJECTION_YEARS - 1 ? `'${faYear.toString().slice(-2)}` : "—"}
                </span>
              </div>
            );
          })}
        </div>

        {Object.keys(faByYear).length > 0 && (
          <div className="p-3 border-t border-border mt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Free Agent Timeline</h4>
            <div className="space-y-2">
              {years.map(y => {
                const fas = faByYear[y];
                if (!fas?.length) return null;
                return (
                  <div key={y}>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={y === CURRENT_YEAR ? "destructive" : "secondary"} className="text-[10px]">
                        {y} {y === CURRENT_YEAR ? "Summer" : ""}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">{fas.length} player{fas.length !== 1 ? "s" : ""}</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {fas.map(p => (
                        <Badge key={p.id} variant="outline" className="text-[10px] font-normal">
                          {p.name} ({p.position}) · {formatCurrency(p.capHit || 0)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <Dialog open={!!selectedPlayer} onOpenChange={(open) => { if (!open) setSelectedPlayer(null); }}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          {selectedPlayer && (() => {
            const p = selectedPlayer;
            const faYear = CURRENT_YEAR + (p.contractYears || 1) - 1;
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs font-mono">{p.position}</Badge>
                    {p.name}
                  </DialogTitle>
                  <DialogDescription>{teamName}</DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-muted/30 rounded-lg p-3 text-center">
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Age</div>
                      <div className="text-lg font-bold">{p.age}</div>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-3 text-center">
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Cap Hit</div>
                      <div className="text-lg font-bold text-primary font-mono">{p.capHit != null ? formatCurrency(p.capHit) : '—'}</div>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-3 text-center">
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Free Agent</div>
                      <div className={cn(
                        "text-lg font-bold font-mono",
                        faYear === CURRENT_YEAR ? "text-red-400" : faYear === CURRENT_YEAR + 1 ? "text-yellow-400" : "text-foreground"
                      )}>
                        '{faYear.toString().slice(-2)}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {p.id < -999 && <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Rookie</Badge>}
                    {p.noTradeClause && <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">No-Trade Clause</Badge>}
                    {p.status === "injured" && <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Injured Reserve</Badge>}
                    {p.status === "franchise_tag" && <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Franchise Tag</Badge>}
                    <Badge variant="secondary">{p.contractYears || 1} yr contract</Badge>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Salary Projection</h4>
                    <div className="space-y-1.5">
                      {years.map((y, yi) => {
                        const projected = getPlayerSalaryForYear(p, yi);
                        if (projected === null) return null;
                        const isLastYear = yi === (p.contractYears || 1) - 1;
                        return (
                          <div key={y} className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">{y}-{(y + 1).toString().slice(-2)}</span>
                            <div className="flex items-center gap-2">
                              <span className={cn("font-mono font-medium", isLastYear ? "text-red-400" : "text-foreground")}>
                                {formatCurrency(projected)}
                              </span>
                              {isLastYear && <Badge variant="outline" className="text-[9px] h-4 text-red-400 border-red-400/30">Expiring</Badge>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <DialogFooter className="flex-col sm:flex-row gap-2">
                  {onReleasePlayer && p.id > 0 && (
                    <Button
                      variant="destructive"
                      className="w-full sm:w-auto"
                      onClick={() => {
                        onReleasePlayer(p.id);
                        setSelectedPlayer(null);
                      }}
                      data-testid={`button-capsheet-release-${p.id}`}
                    >
                      <Scissors className="h-4 w-4 mr-2" />
                      Release Player
                    </Button>
                  )}
                  <Button variant="outline" className="w-full sm:w-auto" onClick={() => setSelectedPlayer(null)}>
                    Close
                  </Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}

import Layout from "@/components/Layout";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, 
  Filter, 
  Play, 
  SkipForward, 
  Pause, 
  RotateCcw,
  CheckCircle2,
  Clock,
  Download,
  Share2,
  User,
  Monitor,
  ArrowLeftRight,
  Columns,
  LayoutGrid,
  List,
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  Activity,
  Ruler,
  Weight,
  Timer,
  Zap,
  Award,
  ChevronDown,
  ChevronUp,
  Link,
  Copy,
  Check,
  Users,
  Wifi,
  WifiOff,
  FileSpreadsheet,
  Save,
  Lightbulb,
  Sparkles,
  Star
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import DraftSetup, { type TeamControllers, type DraftSettings, type PickTrade } from "@/components/DraftSetup";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useSharedDraft } from "@/hooks/useSharedDraft";
import type { Prospect, Team, DraftOrderEntry, FreeAgent } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { getTeamBuilderState, type TeamBuilderState } from "./TeamBuilder";
import { useSport } from "@/lib/sportContext";
import { projectRookieContract, saveMockRookies, type MockRookie } from "@/lib/rookieScale";

interface Player {
  id: string;
  name: string;
  position: string;
  college: string;
  height: string;
  weight: string;
  forty_time?: number | null;
  vertical?: number | null;
  bench_reps?: number | null;
  broad_jump?: string | null;
  shuttle?: number | null;
  three_cone?: number | null;
  grade: number;
  projected_round: number;
}

interface Pick {
  round: number;
  pick: number;
  overall: number;
  team: string;
  player?: Player;
}

interface DraftSlot {
  round: number;
  pickInRound: number;
  overall: number;
  teamCode: string;
  originalTeamCode?: string | null;
}

const MOCK_DRAFT_STORAGE_KEY = "draftscout_mock_draft_progress";

interface SavedDraftState {
  teamControllers: TeamControllers;
  selectedRounds: number;
  includeCompPicks: boolean;
  trades: PickTrade[];
  currentPickIndex: number;
  picks: Pick[];
  pickedPlayerIds: string[];
  activeRoundTab: string;
  viewMode: 'standard' | 'bigboard';
  timestamp: number;
}

function saveDraftProgress(state: SavedDraftState) {
  try {
    localStorage.setItem(MOCK_DRAFT_STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

function loadDraftProgress(): SavedDraftState | null {
  try {
    const raw = localStorage.getItem(MOCK_DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const hoursSince = (Date.now() - (parsed.timestamp || 0)) / (1000 * 60 * 60);
    if (hoursSince > 24) {
      localStorage.removeItem(MOCK_DRAFT_STORAGE_KEY);
      return null;
    }
    if (typeof parsed.selectedRounds !== 'number') {
      localStorage.removeItem(MOCK_DRAFT_STORAGE_KEY);
      return null;
    }
    if (typeof parsed.includeCompPicks !== 'boolean') {
      parsed.includeCompPicks = true;
    }
    if (!Array.isArray(parsed.trades)) {
      parsed.trades = [];
    }
    return parsed;
  } catch {
    return null;
  }
}

function clearDraftProgress() {
  localStorage.removeItem(MOCK_DRAFT_STORAGE_KEY);
}

function mapProspectToPlayer(p: Prospect): Player {
  return {
    id: String(p.id),
    name: p.name,
    position: p.position,
    college: p.college,
    height: p.height,
    weight: p.weight,
    forty_time: p.fortyTime,
    vertical: p.vertical,
    bench_reps: p.benchReps,
    broad_jump: p.broadJump,
    shuttle: p.shuttle,
    three_cone: p.threeCone,
    grade: p.grade,
    projected_round: p.projectedRound,
  };
}

export default function MockDraft() {
  const params = useParams<{ code?: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { sport, positions: sportPositions } = useSport();
  const sessionCode = params.code || null;
  const isSharedMode = !!sessionCode;

  const shared = useSharedDraft(sessionCode);
  const [copied, setCopied] = useState(false);
  const [creatingSession, setCreatingSession] = useState(false);

  const { data: prospectsData, isLoading: prospectsLoading } = useQuery<Prospect[]>({ queryKey: [`/api/prospects?sport=${sport}`] });
  const { data: teamsData, isLoading: teamsLoading } = useQuery<Team[]>({ queryKey: [`/api/teams?sport=${sport}`] });
  const { data: draftOrderData, isLoading: draftOrderLoading } = useQuery<DraftOrderEntry[]>({ queryKey: [`/api/draft-order?sport=${sport}`] });

  const [teamBuilderData] = useState<TeamBuilderState>(() => getTeamBuilderState(sport));

  const teamsMap = useMemo(() => {
    if (!teamsData) return {} as Record<string, Team>;
    const map: Record<string, Team> = {};
    teamsData.forEach(t => { map[t.code] = t; });
    return map;
  }, [teamsData]);

  const teamsPerRound = sport === "NFL" ? 32 : 30;

  const allDraftSlots = useMemo(() => {
    if (!draftOrderData) return [] as DraftSlot[];
    const sorted = [...draftOrderData].sort((a, b) => a.pickNumber - b.pickNumber);
    const roundCounters: Record<number, number> = {};
    return sorted.map(d => {
      if (!roundCounters[d.round]) roundCounters[d.round] = 0;
      roundCounters[d.round]++;
      return {
        round: d.round,
        pickInRound: roundCounters[d.round],
        overall: d.pickNumber,
        teamCode: d.teamCode,
        originalTeamCode: d.originalTeamCode,
      };
    });
  }, [draftOrderData]);

  const draftOrderTeams = useMemo(() => {
    return allDraftSlots.map(d => d.teamCode);
  }, [allDraftSlots]);

  const allPlayers = useMemo(() => {
    if (!prospectsData) return [] as Player[];
    return prospectsData.map(mapProspectToPlayer);
  }, [prospectsData]);

  const allPlayersMap = useMemo(() => {
    const map: Record<string, Player> = {};
    allPlayers.forEach(p => { map[p.id] = p; });
    return map;
  }, [allPlayers]);

  const saveMutation = useMutation({
    mutationFn: (data: { name: string; year: number; method: string; rounds: number; teamScope: string; sport: string; picks: { round: number; overallPick: number; teamCode: string; playerName: string; position: string; college: string }[] }) =>
      apiRequest("POST", "/api/mock-drafts", data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [`/api/mock-drafts?sport=${sport}`] }),
  });

  const savedProgress = useMemo(() => isSharedMode ? null : loadDraftProgress(), []);
  const hasSavedProgress = !!savedProgress && savedProgress.picks.length > 0;

  const [setupOpen, setSetupOpen] = useState(!isSharedMode && !hasSavedProgress);
  const [teamControllers, setTeamControllers] = useState<TeamControllers>(savedProgress?.teamControllers || {});
  const [selectedRounds, setSelectedRounds] = useState(savedProgress?.selectedRounds || 1);
  const [includeCompPicks, setIncludeCompPicks] = useState(savedProgress?.includeCompPicks ?? true);
  const [draftTrades, setDraftTrades] = useState<PickTrade[]>(savedProgress?.trades || []);
  
  const [currentPickIndex, setCurrentPickIndex] = useState(savedProgress?.currentPickIndex || 0);
  const [picks, setPicks] = useState<Pick[]>(savedProgress?.picks || []);
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPosition, setSelectedPosition] = useState<string>("ALL");
  const [showSummary, setShowSummary] = useState(false);
  const [playersInitialized, setPlayersInitialized] = useState(false);
  const [restoredFromSave, setRestoredFromSave] = useState(false);
  const [activeRoundTab, setActiveRoundTab] = useState(savedProgress?.activeRoundTab || "all");
  const [showComparison, setShowComparison] = useState(false);
  const [showGrades, setShowGrades] = useState(false);
  const [viewMode, setViewMode] = useState<'standard' | 'bigboard'>(savedProgress?.viewMode || 'standard');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  useEffect(() => {
    if (!isSharedMode || !shared.session || allPlayers.length === 0) return;
    const sess = shared.session;
    setTeamControllers(sess.teamControllers as TeamControllers);
    setSelectedRounds(sess.rounds);
    setCurrentPickIndex(sess.currentPickIndex);
    const sessionPicks = (sess.picks as any[]) || [];
    setPicks(sessionPicks);
    const usedIds = new Set(sessionPicks.map((p: any) => p.player?.id));
    setAvailablePlayers(allPlayers.filter(p => !usedIds.has(p.id)));
    setPlayersInitialized(true);
    if (sess.status === "active" || sess.status === "completed") {
      setSetupOpen(false);
    }
    if (sess.status === "waiting") {
      setSetupOpen(true);
    }
    if (sess.status === "completed") {
      setShowSummary(true);
    }
  }, [isSharedMode, shared.session, allPlayers]);

  const activeDraftSlots = useMemo(() => {
    let slots = allDraftSlots.filter(s => s.round <= selectedRounds);

    if (!includeCompPicks) {
      const roundCounts: Record<number, number> = {};
      slots = slots.filter(s => {
        if (!roundCounts[s.round]) roundCounts[s.round] = 0;
        roundCounts[s.round]++;
        return roundCounts[s.round] <= teamsPerRound;
      });
    }

    if (draftTrades.length > 0) {
      slots = slots.map(s => {
        const trade = draftTrades.find(t => t.pickOverall === s.overall);
        if (trade) {
          return { ...s, teamCode: trade.toTeam };
        }
        return s;
      });
    }

    return slots;
  }, [allDraftSlots, selectedRounds, includeCompPicks, draftTrades, teamsPerRound]);

  useEffect(() => {
    if (!isSharedMode && allPlayers.length > 0 && !playersInitialized) {
      if (savedProgress && savedProgress.pickedPlayerIds.length > 0 && !restoredFromSave) {
        const usedIds = new Set(savedProgress.pickedPlayerIds);
        setAvailablePlayers(allPlayers.filter(p => !usedIds.has(p.id)));
        setRestoredFromSave(true);
      } else {
        setAvailablePlayers(allPlayers);
      }
      setPlayersInitialized(true);
    }
  }, [allPlayers, playersInitialized, isSharedMode, savedProgress, restoredFromSave]);

  useEffect(() => {
    if (isSharedMode || !playersInitialized || picks.length === 0) return;
    saveDraftProgress({
      teamControllers,
      selectedRounds,
      includeCompPicks,
      trades: draftTrades,
      currentPickIndex,
      picks,
      pickedPlayerIds: picks.map(p => p.player?.id).filter(Boolean) as string[],
      activeRoundTab,
      viewMode,
      timestamp: Date.now(),
    });
  }, [picks, currentPickIndex, activeRoundTab, viewMode, teamControllers, selectedRounds, includeCompPicks, draftTrades, playersInitialized, isSharedMode]);

  const isLoading = prospectsLoading || teamsLoading || draftOrderLoading;

  const currentSlot = activeDraftSlots[currentPickIndex];
  const currentTeamCode = currentSlot?.teamCode || "END";
  const currentTeam = teamsMap[currentTeamCode];
  const isDraftOver = currentPickIndex >= activeDraftSlots.length || (currentPickIndex > 0 && availablePlayers.length === 0);
  
  const currentController = teamControllers[currentTeamCode];
  const isUserTurn = currentController?.type === 'USER';

  const handleCreateSharedDraft = async () => {
    setCreatingSession(true);
    try {
      const res = await apiRequest("POST", "/api/draft-sessions");
      const session = await res.json();
      navigate(`/mock-draft/${session.code}`);
    } catch (err) {
      toast({ title: "Failed to create shared draft", variant: "destructive" });
    } finally {
      setCreatingSession(false);
    }
  };

  const copyShareLink = () => {
    if (!sessionCode) return;
    const url = `${window.location.origin}/mock-draft/${sessionCode}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast({ title: "Link copied to clipboard!" });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStartDraft = (controllers: TeamControllers, settings: DraftSettings) => {
    if (isSharedMode) {
      const playerIds = allPlayers.map(p => p.id);
      shared.startDraft(controllers, settings.rounds, playerIds);
    } else {
      clearDraftProgress();
      setTeamControllers(controllers);
      setSelectedRounds(settings.rounds);
      setIncludeCompPicks(settings.includeCompPicks);
      setDraftTrades(settings.trades);
      setCurrentPickIndex(0);
      setPicks([]);
      setAvailablePlayers(allPlayers);
      setSetupOpen(false);
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    const shouldAutoPick = isSimulating && !isDraftOver && !isUserTurn;
    if (shouldAutoPick) {
      interval = setInterval(() => {
        makePick();
      }, 300);
    } else if (isSimulating && isUserTurn) {
      setIsSimulating(false);
    }
    if (isDraftOver && isSimulating) {
      setIsSimulating(false);
      setShowSummary(true);
    }
    return () => clearInterval(interval);
  }, [isSimulating, currentPickIndex, isDraftOver, isUserTurn]);

  useEffect(() => {
    if (isDraftOver && !showSummary && activeDraftSlots.length > 0 && picks.length > 0) {
      setShowSummary(true);
    }
  }, [isDraftOver]);

  const posNeedMap: Record<string, string[]> = useMemo(() => ({
    QB: ['QB'], RB: ['RB'], WR: ['WR'], TE: ['TE'],
    OT: ['OT', 'OL'], OL: ['OL', 'OT', 'G', 'C'],
    G: ['OL', 'G'], C: ['OL', 'C'],
    DT: ['DT', 'DL'], DL: ['DL', 'DT', 'EDGE'],
    EDGE: ['EDGE', 'DL'], LB: ['LB'],
    CB: ['CB', 'DB'], S: ['S', 'DB'], DB: ['CB', 'S', 'DB'],
    PG: ['PG'], SG: ['SG'], SF: ['SF'], PF: ['PF'],
  }), []);

  const getCpuPick = useCallback((teamCode: string, available: Player[]): Player => {
    if (available.length === 0) return available[0];
    const team = teamsMap[teamCode];
    if (!team || !team.needs || team.needs.length === 0) return available[0];

    const alreadyDrafted = picks.filter(p => p.team === teamCode).map(p => p.player?.position).filter(Boolean) as string[];
    const filledNeeds = new Set<string>();
    alreadyDrafted.forEach(pos => {
      const mappedNeeds = posNeedMap[pos] || [pos];
      mappedNeeds.forEach(n => filledNeeds.add(n));
    });

    const remainingNeeds = team.needs.filter(n => !filledNeeds.has(n));
    const needsToUse = remainingNeeds.length > 0 ? remainingNeeds : team.needs;

    const windowSize = Math.min(available.length, Math.max(15, Math.ceil(available.length * 0.15)));
    const candidates = available.slice(0, windowSize);

    let bestPlayer = candidates[0];
    let bestScore = -Infinity;

    for (const p of candidates) {
      const rankPenalty = candidates.indexOf(p);
      const bpaScore = 100 - (rankPenalty / windowSize) * 100;

      const playerNeeds = posNeedMap[p.position] || [p.position];
      let needPriority = -1;
      for (let i = 0; i < needsToUse.length; i++) {
        if (playerNeeds.includes(needsToUse[i])) {
          needPriority = i;
          break;
        }
      }

      let needScore = 0;
      if (needPriority === 0) needScore = 100;
      else if (needPriority === 1) needScore = 80;
      else if (needPriority === 2) needScore = 60;
      else if (needPriority >= 3) needScore = 40;

      const totalScore = bpaScore * 0.55 + needScore * 0.45;

      if (totalScore > bestScore) {
        bestScore = totalScore;
        bestPlayer = p;
      }
    }

    return bestPlayer;
  }, [teamsMap, picks, posNeedMap]);

  const getSuggestions = useCallback((teamCode: string, available: Player[]) => {
    if (available.length === 0) return { bpa: [], needFits: [], recommended: null as Player | null, hasNeeds: false };
    const team = teamsMap[teamCode];
    if (!team) return { bpa: available.slice(0, 3), needFits: [], recommended: available[0], hasNeeds: false };

    const alreadyDrafted = picks.filter(p => p.team === teamCode).map(p => p.player?.position).filter(Boolean) as string[];
    const filledNeeds = new Set<string>();
    alreadyDrafted.forEach(pos => {
      const mappedNeeds = posNeedMap[pos] || [pos];
      mappedNeeds.forEach(n => filledNeeds.add(n));
    });

    const remainingNeeds = (team.needs || []).filter(n => !filledNeeds.has(n));
    const needsToUse = remainingNeeds.length > 0 ? remainingNeeds : (team.needs || []);

    const bpa = available.slice(0, 3);

    const needFits: { player: Player; need: string; score: number }[] = [];
    const windowSize = Math.min(available.length, Math.max(20, Math.ceil(available.length * 0.2)));
    const candidates = available.slice(0, windowSize);

    for (const need of needsToUse.slice(0, 4)) {
      const matching = candidates.filter(p => {
        const playerNeeds = posNeedMap[p.position] || [p.position];
        return playerNeeds.includes(need);
      });
      if (matching.length > 0 && !needFits.some(nf => nf.player.id === matching[0].id)) {
        needFits.push({ player: matching[0], need, score: matching[0].grade || 0 });
      }
    }

    let recommended: Player | null = null;
    let bestScore = -Infinity;
    for (const p of candidates) {
      const rankPenalty = candidates.indexOf(p);
      const bpaScore = 100 - (rankPenalty / windowSize) * 100;
      const playerNeeds = posNeedMap[p.position] || [p.position];
      let needPriority = -1;
      for (let i = 0; i < needsToUse.length; i++) {
        if (playerNeeds.includes(needsToUse[i])) { needPriority = i; break; }
      }
      let needScore = 0;
      if (needPriority === 0) needScore = 100;
      else if (needPriority === 1) needScore = 80;
      else if (needPriority === 2) needScore = 60;
      else if (needPriority >= 3) needScore = 40;
      const totalScore = bpaScore * 0.55 + needScore * 0.45;
      if (totalScore > bestScore) { bestScore = totalScore; recommended = p; }
    }

    return { bpa, needFits, recommended, hasNeeds: needsToUse.length > 0 };
  }, [teamsMap, picks, posNeedMap]);

  const suggestions = useMemo(() => {
    if (!isUserTurn || isDraftOver || availablePlayers.length === 0) return null;
    const slot = activeDraftSlots[currentPickIndex];
    if (!slot) return null;
    return getSuggestions(slot.teamCode, availablePlayers);
  }, [isUserTurn, isDraftOver, availablePlayers, activeDraftSlots, currentPickIndex, getSuggestions]);

  const makePick = (player?: Player) => {
    if (isDraftOver) return;
    const slot = activeDraftSlots[currentPickIndex];
    if (!slot) return;

    const playerToPick = player || getCpuPick(slot.teamCode, availablePlayers);
    if (!playerToPick) return;
    
    const newPick: Pick = {
      round: slot.round,
      pick: slot.pickInRound,
      overall: slot.overall,
      team: slot.teamCode,
      player: playerToPick
    };

    if (isSharedMode) {
      if (isUserTurn) {
        shared.sendPick(newPick);
      } else {
        shared.sendSimPick(newPick);
      }
    } else {
      setPicks(prev => [...prev, newPick]);
      setAvailablePlayers(prev => prev.filter(p => p.id !== playerToPick.id));
      setCurrentPickIndex(prev => prev + 1);
    }
  };

  const resetDraft = () => {
    if (isSharedMode) {
      shared.resetDraft();
    } else {
      clearDraftProgress();
      setSetupOpen(true);
      setCurrentPickIndex(0);
      setPicks([]);
      setAvailablePlayers(allPlayers);
      setIsSimulating(false);
      setShowSummary(false);
      setShowComparison(false);
      setShowGrades(false);
      setPlayersInitialized(false);
      setActiveRoundTab("all");
    }
  };

  const handleShareResults = () => {
    saveMutation.mutate({
      name: `${sport} Mock Draft ${new Date().toLocaleDateString()}`,
      year: sport === "NFL" ? 2026 : 2025,
      method: "User",
      rounds: selectedRounds,
      teamScope: "All",
      sport,
      picks: picks.map(p => ({
        round: p.round,
        overallPick: p.overall,
        teamCode: p.team,
        playerName: p.player?.name || "",
        position: p.player?.position || "",
        college: p.player?.college || "",
      })),
    });
  };

  const [appliedToBuilder, setAppliedToBuilder] = useState(false);

  const handleApplyToTeamBuilder = () => {
    const rookies: MockRookie[] = picks
      .filter(p => p.player)
      .map(p => {
        const contract = projectRookieContract(sport, p.overall, p.round);
        return {
          name: p.player!.name,
          position: p.player!.position,
          college: p.player!.college,
          teamCode: p.team,
          overallPick: p.overall,
          round: p.round,
          capHit: contract.capHit,
          salaryByYear: contract.salaryByYear,
          contractYears: contract.contractYears,
          sport,
        };
      });
    saveMockRookies(rookies, sport);
    setAppliedToBuilder(true);
    toast({ title: "Mock Draft Applied", description: `${rookies.length} rookies added to Team Builder with projected contracts.` });
  };

  const generateCSV = useCallback(() => {
    const headers = ['Pick #', 'Round', 'Pick in Round', 'Team', 'Team Name', 'Player', 'Position', 'College', 'Grade', 'Projected Round', 'Height', 'Weight', '40-Yard', 'Vertical', 'Bench Reps', 'Broad Jump'];
    const rows = picks.map(p => [
      p.overall,
      p.round,
      p.pick,
      p.team,
      teamsMap[p.team]?.name || p.team,
      p.player?.name || '',
      p.player?.position || '',
      p.player?.college || '',
      p.player?.grade || '',
      p.player?.projected_round || '',
      p.player?.height || '',
      p.player?.weight || '',
      p.player?.forty_time || '',
      p.player?.vertical || '',
      p.player?.bench_reps || '',
      p.player?.broad_jump || '',
    ]);
    return [headers, ...rows].map(row => row.map(cell => {
      const str = String(cell);
      return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
    }).join(',')).join('\n');
  }, [picks, teamsMap]);

  const handleExportCSV = useCallback(() => {
    const csv = generateCSV();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mock_draft_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast({ title: "CSV downloaded!" });
  }, [generateCSV, toast]);

  const handleExportGoogleSheets = useCallback(() => {
    const csv = generateCSV();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mock_draft_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setTimeout(() => {
      window.open('https://sheets.google.com/create', '_blank');
    }, 500);
    toast({ title: "CSV downloaded! Opening Google Sheets — use File → Import to load it." });
  }, [generateCSV, toast]);

  const filteredPlayers = availablePlayers.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.college.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPos = selectedPosition === "ALL" || p.position === selectedPosition;
    return matchesSearch && matchesPos;
  });

  const filteredPicks = useMemo(() => {
    if (activeRoundTab === "all") return picks;
    const round = parseInt(activeRoundTab);
    return picks.filter(p => p.round === round);
  }, [picks, activeRoundTab]);

  const currentRound = currentSlot?.round || 1;
  const picksInCurrentRound = picks.filter(p => p.round === currentRound).length;

  const roundTabs = useMemo(() => {
    const tabs = [{ value: "all", label: "All" }];
    for (let i = 1; i <= selectedRounds; i++) {
      tabs.push({ value: String(i), label: `R${i}` });
    }
    return tabs;
  }, [selectedRounds]);

  if (isLoading) {
    return (
      <Layout>
        <div className="h-[calc(100vh-8rem)] flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-muted-foreground text-lg">Loading draft data...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <DraftSetup isOpen={setupOpen} onStart={handleStartDraft} onClose={() => setSetupOpen(false)} teams={teamsMap} draftOrderTeams={draftOrderTeams} draftSlots={allDraftSlots} />

      <div className="lg:h-[calc(100vh-8rem)] flex flex-col gap-3 sm:gap-4">
        {isSharedMode && (
          <div className="bg-card border border-border rounded-lg px-3 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-2 sm:gap-4 shadow-sm">
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <div className={cn("flex items-center gap-1.5 text-xs sm:text-sm font-medium", shared.connected ? "text-green-400" : "text-red-400")}>
                {shared.connected ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
                {shared.connected ? "Connected" : "Reconnecting..."}
              </div>
              <Separator orientation="vertical" className="h-5 hidden sm:block" />
              <div className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                {shared.clientCount}
              </div>
              <Badge variant="outline" className="text-[10px] sm:text-xs font-mono hidden sm:inline-flex">
                {sessionCode}
              </Badge>
            </div>
            <Button variant="outline" size="sm" onClick={copyShareLink} className="gap-1.5 text-xs" data-testid="button-copy-share-link">
              {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied!" : "Copy"}
            </Button>
          </div>
        )}

        {/* Header / Status Bar */}
        <div className="bg-card border border-border rounded-lg p-3 sm:p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 sm:gap-4 shadow-sm">
          <div className="flex items-center gap-3 sm:gap-4 w-full md:w-auto">
            {!isDraftOver ? (
              <>
                <div 
                  className="h-12 w-12 sm:h-16 sm:w-16 rounded-full flex items-center justify-center text-base sm:text-xl font-bold border-4 border-background shadow-lg transition-all duration-300 relative shrink-0"
                  style={{ backgroundColor: currentTeam?.primaryColor, color: '#fff' }}
                  data-testid="status-current-team"
                >
                  {currentTeamCode}
                  {isUserTurn && (
                    <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-1 border border-border shadow-sm">
                        <User className="h-3 w-3 text-primary" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                    <span className="text-muted-foreground text-xs sm:text-sm font-medium uppercase tracking-wider">
                        {isUserTurn ? `On The Clock` : "CPU Pick"}
                    </span>
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px] sm:text-xs">
                      <Clock className="h-3 w-3 mr-0.5 sm:mr-1" /> R{currentRound} P{currentSlot?.pickInRound}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px]" data-testid="text-overall-pick">
                      #{currentSlot?.overall}
                    </Badge>
                  </div>
                  <h2 className="text-lg sm:text-2xl font-display font-bold truncate" data-testid="text-team-name">{currentTeam?.name}</h2>
                  <div className="flex gap-1.5 text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1 flex-wrap">
                    Needs: {currentTeam?.needs.slice(0, 4).join(" • ")}{(currentTeam?.needs.length || 0) > 4 ? ' ...' : ''}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-full bg-primary/20 flex items-center justify-center text-primary shrink-0">
                  <CheckCircle2 className="h-6 w-6 sm:h-8 sm:w-8" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-2xl font-display font-bold">Draft Complete</h2>
                  <p className="text-sm text-muted-foreground">{selectedRounds} round{selectedRounds > 1 ? 's' : ''}, {picks.length} picks made</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-end w-full md:w-auto">
            {picks.length > 0 && (
              <Button
                variant={viewMode === 'bigboard' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode(v => v === 'standard' ? 'bigboard' : 'standard')}
                className="gap-1.5 text-xs sm:text-sm h-8"
                data-testid="button-toggle-bigboard"
              >
                {viewMode === 'bigboard' ? <List className="h-3.5 w-3.5" /> : <LayoutGrid className="h-3.5 w-3.5" />}
                <span className="hidden sm:inline">{viewMode === 'bigboard' ? 'Standard' : 'Big Board'}</span>
              </Button>
            )}
            {isDraftOver && (
              <>
                <Button variant="default" size="sm" onClick={() => setShowGrades(true)} className="gap-1.5 text-xs sm:text-sm h-8" data-testid="button-grades">
                  <Award className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Grades</span>
                </Button>
                <Button variant="default" size="sm" onClick={() => setShowComparison(true)} className="gap-1.5 text-xs sm:text-sm h-8" data-testid="button-compare">
                  <Columns className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Compare</span>
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportGoogleSheets} className="gap-1.5 text-xs h-8 hidden sm:flex" data-testid="button-export-sheets">
                  <FileSpreadsheet className="h-3.5 w-3.5" /> Sheets
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-1.5 text-xs h-8" data-testid="button-export-csv">
                  <Download className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShareResults}
                  disabled={saveMutation.isPending || saveMutation.isSuccess}
                  className="gap-1.5 text-xs h-8"
                  data-testid="button-save-draft"
                >
                  <Save className="h-3.5 w-3.5" /> <span className="hidden sm:inline">{saveMutation.isPending ? "Saving..." : saveMutation.isSuccess ? "Saved!" : "Save"}</span>
                </Button>
              </>
            )}
            {!isDraftOver && (
              <>
                {!isUserTurn && (
                    <Button 
                    variant={isSimulating ? "destructive" : "default"}
                    size="sm"
                    onClick={() => setIsSimulating(!isSimulating)}
                    className="gap-1.5 text-xs sm:text-sm h-8"
                    data-testid="button-auto-sim"
                    >
                    {isSimulating ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                    {isSimulating ? "Pause" : "Auto"}
                    </Button>
                )}
                
                <Button variant="secondary" size="sm" onClick={() => makePick()} disabled={isSimulating} className="gap-1.5 text-xs sm:text-sm h-8" data-testid="button-sim-pick">
                  <SkipForward className="h-3.5 w-3.5" /> Sim
                </Button>
              </>
            )}
            {!isSharedMode && !isDraftOver && setupOpen && (
              <Button variant="outline" size="sm" onClick={handleCreateSharedDraft} disabled={creatingSession} className="gap-1.5 text-xs h-8 hidden sm:flex" data-testid="button-create-shared">
                <Link className="h-3.5 w-3.5" /> Share
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={resetDraft} className="gap-1.5 text-xs h-8" data-testid="button-reset">
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {viewMode === 'bigboard' ? (
          <BigBoardView
            picks={picks}
            selectedRounds={selectedRounds}
            teamsMap={teamsMap}
            teamControllers={teamControllers}
            activeRoundTab={activeRoundTab}
            setActiveRoundTab={setActiveRoundTab}
            roundTabs={roundTabs}
          />
        ) : (
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-3 sm:gap-6 min-h-0 overflow-auto lg:overflow-hidden">
          <Card className="lg:col-span-3 flex flex-col h-[50vh] md:h-full overflow-hidden border-border/50 bg-card/50">
            <CardHeader className="py-3 px-4 border-b border-border space-y-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Draft Board</CardTitle>
                <Badge variant="secondary" data-testid="text-picks-count">{picks.length}/{activeDraftSlots.length}</Badge>
              </div>
              {selectedRounds > 1 && (
                <div className="flex gap-1 flex-wrap">
                  {roundTabs.map(tab => (
                    <Button
                      key={tab.value}
                      variant={activeRoundTab === tab.value ? "default" : "ghost"}
                      size="sm"
                      className="h-6 text-[10px] px-2"
                      onClick={() => setActiveRoundTab(tab.value)}
                      data-testid={`button-round-tab-${tab.value}`}
                    >
                      {tab.label}
                    </Button>
                  ))}
                </div>
              )}
            </CardHeader>
            <ScrollArea className="flex-1">
              <div className="divide-y divide-border/50">
                {filteredPicks.map((pick) => (
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={`${pick.round}-${pick.pick}`} 
                    className="p-3 flex items-center gap-3 hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => pick.player && setSelectedPlayer(pick.player)}
                    data-testid={`pick-${pick.overall}`}
                  >
                    <div className="flex flex-col items-center justify-center w-8 text-xs font-mono text-muted-foreground">
                      <span className="font-bold text-foreground">#{pick.overall}</span>
                      <span>R{pick.round}</span>
                    </div>
                    <div 
                      className="h-8 w-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                      style={{ backgroundColor: teamsMap[pick.team]?.primaryColor }}
                    >
                      {pick.team}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-sm truncate">{pick.player?.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {pick.player?.position} • {pick.player?.college}
                      </p>
                    </div>
                  </motion.div>
                ))}
                {filteredPicks.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground text-sm italic">
                    {picks.length === 0 ? "The draft has not started yet." : "No picks in this round yet."}
                  </div>
                )}
              </div>
            </ScrollArea>
          </Card>

          <Card className="lg:col-span-6 flex flex-col h-[50vh] md:h-full overflow-hidden border-border/50 bg-card/50 md:col-span-1 lg:col-span-6">
             <CardHeader className="py-3 px-4 border-b border-border space-y-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Available Prospects</CardTitle>
                <Badge variant="secondary">{filteredPlayers.length} Players</Badge>
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search players..." 
                    className="pl-8" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    data-testid="input-search"
                  />
                </div>
              </div>
              <Tabs defaultValue="ALL" onValueChange={setSelectedPosition}>
                <TabsList className="w-full justify-start overflow-x-auto no-scrollbar">
                  {["ALL", ...sportPositions].map(pos => (
                    <TabsTrigger key={pos} value={pos} data-testid={`button-pos-${pos}`}>{pos}</TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </CardHeader>
            <div className="flex-1 overflow-hidden">
               <ScrollArea className="h-full">
                 <div className="divide-y divide-border/50">
                   {filteredPlayers.map((player, index) => (
                     <motion.div 
                        key={player.id}
                        layoutId={player.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className={cn(
                            "flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 transition-colors cursor-pointer group",
                            "hover:bg-primary/10"
                        )}
                        onClick={() => setSelectedPlayer(player)}
                        data-testid={`row-player-${player.id}`}
                     >
                        <span className="font-mono text-muted-foreground text-xs sm:text-sm w-6 sm:w-8 shrink-0 text-right">{index + 1}</span>
                        <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-mono shrink-0">
                          {player.position}
                        </Badge>
                        <div className="flex-1 min-w-0">
                          <span className="font-medium group-hover:text-primary transition-colors text-sm truncate block">{player.name}</span>
                          <span className="text-xs text-muted-foreground truncate block">{player.college}</span>
                        </div>
                        <span className="font-mono font-bold text-primary text-sm shrink-0">{player.grade}</span>
                        <span className="font-mono text-muted-foreground text-[10px] sm:text-xs shrink-0 hidden sm:inline">R{player.projected_round}</span>
                     </motion.div>
                   ))}
                 </div>
               </ScrollArea>
            </div>
          </Card>

          <Card className="lg:col-span-3 flex flex-col h-auto md:h-full overflow-hidden border-border/50 bg-card/50 md:col-span-2 lg:col-span-3">
            <CardHeader className="py-3 sm:py-4 px-4 border-b border-border">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                Scouting Report
                {isUserTurn && suggestions && <Badge variant="outline" className="text-[9px] bg-yellow-500/10 border-yellow-500/30 text-yellow-400">Your Pick</Badge>}
              </CardTitle>
            </CardHeader>
            <ScrollArea className="flex-1">
            <CardContent className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              {!isDraftOver && availablePlayers.length > 0 ? (
                <>
                  <div className="space-y-3 sm:space-y-4 text-center">
                    <div className="h-16 w-16 sm:h-24 sm:w-24 mx-auto rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-2xl sm:text-3xl font-bold text-white shadow-xl shadow-primary/20">
                       {availablePlayers[0].grade}
                    </div>
                    <div>
                      <h3 className="text-lg sm:text-2xl font-bold" data-testid="text-top-prospect">{availablePlayers[0].name}</h3>
                      <p className="text-sm text-muted-foreground">{availablePlayers[0].position} • {availablePlayers[0].college}</p>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground uppercase">Height</p>
                      <p className="font-mono font-bold">{availablePlayers[0].height}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground uppercase">Weight</p>
                      <p className="font-mono font-bold">{availablePlayers[0].weight} lbs</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground uppercase">40 Time</p>
                      <p className="font-mono font-bold text-primary">{availablePlayers[0].forty_time || "—"}s</p>
                    </div>
                     <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground uppercase">Proj. Rnd</p>
                      <p className="font-mono font-bold">{availablePlayers[0].projected_round}</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      className="flex-1 h-12 text-lg shadow-[0_0_15px_hsl(var(--primary)/0.4)]"
                      onClick={() => makePick(availablePlayers[0])}
                      disabled={isSimulating || !isUserTurn}
                      variant={isUserTurn ? "default" : "secondary"}
                      data-testid="button-draft-top"
                    >
                      {isUserTurn 
                          ? `Draft ${availablePlayers[0].name.split(' ')[1] || availablePlayers[0].name}`
                          : "Waiting..."}
                    </Button>
                    <Button
                      variant="outline"
                      className="h-12"
                      onClick={() => setSelectedPlayer(availablePlayers[0])}
                      data-testid="button-view-stats-top"
                    >
                      <Activity className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {!isUserTurn && (
                     <p className="text-xs text-center text-muted-foreground italic">
                        CPU's turn. Use "Sim" to advance or enable Auto.
                     </p>
                  )}

                  {isUserTurn && suggestions && (
                    <>
                      <Separator />
                      <div className="space-y-3" data-testid="suggestions-panel">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                          <Lightbulb className="h-3.5 w-3.5 text-yellow-400" /> Suggested Picks
                        </h4>

                        {suggestions.recommended && suggestions.recommended.id !== availablePlayers[0]?.id && (
                          <div
                            className="p-2.5 rounded-lg bg-gradient-to-r from-primary/15 to-primary/5 border border-primary/30 cursor-pointer hover:border-primary/50 transition-colors"
                            onClick={() => setSelectedPlayer(suggestions.recommended)}
                            data-testid="suggestion-recommended"
                          >
                            <div className="flex items-center gap-1.5 mb-1">
                              <Sparkles className="h-3 w-3 text-primary" />
                              <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                                {suggestions.hasNeeds ? "Best Need + Value" : "Best Available"}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="min-w-0">
                                <p className="font-bold text-sm truncate">{suggestions.recommended.name}</p>
                                <p className="text-[10px] text-muted-foreground">{suggestions.recommended.position} • {suggestions.recommended.college}</p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="font-mono font-bold text-primary text-sm">{suggestions.recommended.grade}</span>
                                <Button
                                  size="sm"
                                  className="h-7 text-xs px-2"
                                  onClick={(e) => { e.stopPropagation(); makePick(suggestions.recommended!); }}
                                  disabled={isSimulating || !isUserTurn}
                                  data-testid="button-draft-recommended"
                                >
                                  Draft
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}

                        {suggestions.needFits.length > 0 && (
                          <div className="space-y-1.5">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                              <Target className="h-3 w-3" /> Best by Need
                            </p>
                            {suggestions.needFits.map((nf) => (
                              <div
                                key={nf.player.id}
                                className="flex items-center gap-2 p-2 rounded-md bg-muted/40 hover:bg-muted/70 cursor-pointer transition-colors group"
                                onClick={() => setSelectedPlayer(nf.player)}
                                data-testid={`suggestion-need-${nf.need}`}
                              >
                                <Badge variant="outline" className="text-[9px] h-4 px-1.5 font-mono shrink-0 border-orange-500/40 text-orange-400">
                                  {nf.need}
                                </Badge>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium truncate group-hover:text-primary transition-colors">{nf.player.name}</p>
                                  <p className="text-[10px] text-muted-foreground">{nf.player.position} • {nf.player.college}</p>
                                </div>
                                <span className="font-mono text-xs font-bold text-primary shrink-0">{nf.player.grade}</span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 text-[10px] px-1.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                  onClick={(e) => { e.stopPropagation(); makePick(nf.player); }}
                                  disabled={isSimulating || !isUserTurn}
                                  data-testid={`button-draft-need-${nf.need}`}
                                >
                                  Draft
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}

                        {suggestions.bpa.length > 1 && (
                          <div className="space-y-1.5">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                              <Star className="h-3 w-3" /> Best Available
                            </p>
                            {suggestions.bpa.slice(1, 3).map((p) => (
                              <div
                                key={p.id}
                                className="flex items-center gap-2 p-2 rounded-md bg-muted/40 hover:bg-muted/70 cursor-pointer transition-colors group"
                                onClick={() => setSelectedPlayer(p)}
                                data-testid={`suggestion-bpa-${p.id}`}
                              >
                                <Badge variant="secondary" className="text-[9px] h-4 px-1.5 font-mono shrink-0">
                                  {p.position}
                                </Badge>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium truncate group-hover:text-primary transition-colors">{p.name}</p>
                                  <p className="text-[10px] text-muted-foreground">{p.college}</p>
                                </div>
                                <span className="font-mono text-xs font-bold text-primary shrink-0">{p.grade}</span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 text-[10px] px-1.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                  onClick={(e) => { e.stopPropagation(); makePick(p); }}
                                  disabled={isSimulating || !isUserTurn}
                                  data-testid={`button-draft-bpa-${p.id}`}
                                >
                                  Draft
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {/* Team Builder Info for current pick's team */}
                  {(() => {
                    const currentTeamCode = activeDraftSlots[currentPickIndex]?.teamCode;
                    const tbState = currentTeamCode ? teamBuilderData[currentTeamCode] : null;
                    if (!tbState || tbState.signedFAs.length === 0) return null;
                    const team = currentTeamCode ? teamsMap[currentTeamCode] : null;
                    if (!team) return null;
                    const tbNeeds = team.needs.filter(n => !tbState.removedNeeds.includes(n));
                    const totalSpent = tbState.signedFAs.reduce((s, fa) => s + fa.marketValue, 0);
                    return (
                      <>
                        <Separator />
                        <div className="space-y-2">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                            <Users className="h-3 w-3" /> FA Signings ({team.code})
                          </h4>
                          <div className="space-y-1">
                            {tbState.signedFAs.map(fa => (
                              <div key={fa.id} className="flex items-center gap-2 text-xs bg-muted/40 rounded px-2 py-1">
                                <Badge variant="secondary" className="text-[9px] h-4 px-1 font-mono">{fa.position}</Badge>
                                <span className="flex-1 truncate">{fa.name}</span>
                                <span className="font-mono text-primary">${fa.marketValue}M</span>
                              </div>
                            ))}
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/30">
                            <span>Cap: ${((team.capSpace || 0) - totalSpent).toFixed(1)}M</span>
                            <span>Needs: {tbNeeds.length > 0 ? tbNeeds.join(', ') : 'All filled'}</span>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </>
              ) : isDraftOver ? (
                <div className="text-center space-y-4">
                  <CheckCircle2 className="h-12 w-12 mx-auto text-primary opacity-50" />
                  <p className="text-muted-foreground font-medium">Draft complete!</p>
                  <Button variant="outline" onClick={() => setShowComparison(true)} className="gap-2" data-testid="button-compare-sidebar">
                    <Columns className="h-4 w-4" /> View Comparison
                  </Button>
                </div>
              ) : (
                <div className="text-center text-muted-foreground">
                  No players available.
                </div>
              )}
            </CardContent>
            </ScrollArea>
          </Card>
        </div>
        )}

        {/* Summary Dialog */}
        <Dialog open={showSummary} onOpenChange={setShowSummary}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-2xl font-display">Draft Complete!</DialogTitle>
              <DialogDescription>
                You have completed a {selectedRounds}-round mock of the {sport === "NFL" ? "2026" : "2025"} {sport} Draft.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="bg-muted p-4 rounded-lg text-center">
                <p className="text-sm text-muted-foreground">Total Picks</p>
                <p className="text-2xl font-bold" data-testid="text-total-picks-summary">{picks.length}</p>
              </div>
              <div className="bg-muted p-4 rounded-lg text-center">
                <p className="text-sm text-muted-foreground">Rounds</p>
                <p className="text-2xl font-bold">{selectedRounds}</p>
              </div>
            </div>
            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={handleShareResults}
                  disabled={saveMutation.isPending || saveMutation.isSuccess}
                  className="gap-2"
                  data-testid="button-save-results"
                >
                  <Save className="h-4 w-4" /> {saveMutation.isPending ? "Saving..." : saveMutation.isSuccess ? "Saved!" : "Save Mock Draft"}
                </Button>
                <Button variant="outline" onClick={handleExportGoogleSheets} className="gap-2" data-testid="button-summary-sheets">
                  <FileSpreadsheet className="h-4 w-4" /> Google Sheets
                </Button>
                <Button variant="outline" onClick={handleExportCSV} className="gap-2" data-testid="button-summary-csv">
                  <Download className="h-4 w-4" /> Download CSV
                </Button>
                <Button variant="outline" onClick={() => { setShowSummary(false); setShowGrades(true); }} className="gap-2" data-testid="button-view-grades">
                  <Award className="h-4 w-4" /> View Grades
                </Button>
              </div>
              <Button
                onClick={appliedToBuilder ? () => navigate("/team-builder") : handleApplyToTeamBuilder}
                className="w-full gap-2"
                variant={appliedToBuilder ? "default" : "outline"}
                data-testid="button-apply-team-builder"
              >
                <TrendingUp className="h-4 w-4" />
                {appliedToBuilder ? "Go to Team Builder" : "Apply Rookies to Team Builder"}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setShowSummary(false)} className="w-full" data-testid="button-close-summary">
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Draft Grades Dialog */}
        <DraftGradesDialog
          open={showGrades}
          onOpenChange={setShowGrades}
          picks={picks}
          teamsMap={teamsMap}
          teamControllers={teamControllers}
        />

        {/* Comparison View Dialog */}
        <ComparisonDialog
          open={showComparison}
          onOpenChange={setShowComparison}
          picks={picks}
          selectedRounds={selectedRounds}
          teamsMap={teamsMap}
          teamControllers={teamControllers}
        />

        {/* Player Stats Dialog */}
        <PlayerStatsDialog
          player={selectedPlayer}
          open={!!selectedPlayer}
          onOpenChange={(open) => { if (!open) setSelectedPlayer(null); }}
          canDraft={!isDraftOver && !isSimulating && isUserTurn}
          onDraft={(player) => {
            makePick(player);
            setSelectedPlayer(null);
          }}
          currentTeam={currentTeam}
        />
      </div>
    </Layout>
  );
}

function PlayerStatsDialog({
  player,
  open,
  onOpenChange,
  canDraft,
  onDraft,
  currentTeam,
}: {
  player: Player | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canDraft: boolean;
  onDraft: (player: Player) => void;
  currentTeam?: Team;
}) {
  const { sport } = useSport();
  if (!player) return null;

  const getStatPercentile = (stat: string, value: number | null | undefined): { percentile: number; label: string; color: string } | null => {
    if (value == null) return null;
    const benchmarks: Record<string, { elite: number; good: number; avg: number; below: number; dir: 'lower' | 'higher' }> = {
      fortyTime: { elite: 4.35, good: 4.45, avg: 4.55, below: 4.70, dir: 'lower' },
      vertical: { elite: 40, good: 36, avg: 33, below: 28, dir: 'higher' },
      benchReps: { elite: 30, good: 24, avg: 18, below: 12, dir: 'higher' },
      shuttle: { elite: 4.10, good: 4.20, avg: 4.30, below: 4.45, dir: 'lower' },
      threeCone: { elite: 6.80, good: 7.00, avg: 7.20, below: 7.40, dir: 'lower' },
    };
    const b = benchmarks[stat];
    if (!b) return null;
    if (b.dir === 'lower') {
      if (value <= b.elite) return { percentile: 95, label: 'Elite', color: 'text-emerald-400' };
      if (value <= b.good) return { percentile: 80, label: 'Above Avg', color: 'text-green-400' };
      if (value <= b.avg) return { percentile: 55, label: 'Average', color: 'text-blue-400' };
      if (value <= b.below) return { percentile: 30, label: 'Below Avg', color: 'text-yellow-400' };
      return { percentile: 10, label: 'Poor', color: 'text-red-400' };
    } else {
      if (value >= b.elite) return { percentile: 95, label: 'Elite', color: 'text-emerald-400' };
      if (value >= b.good) return { percentile: 80, label: 'Above Avg', color: 'text-green-400' };
      if (value >= b.avg) return { percentile: 55, label: 'Average', color: 'text-blue-400' };
      if (value >= b.below) return { percentile: 30, label: 'Below Avg', color: 'text-yellow-400' };
      return { percentile: 10, label: 'Poor', color: 'text-red-400' };
    }
  };

  const hasCombineData = player.forty_time || player.vertical || player.bench_reps || player.broad_jump || player.shuttle || player.three_cone;

  const combineStats = [
    { key: 'fortyTime', label: '40-Yard Dash', value: player.forty_time, display: player.forty_time ? `${player.forty_time}s` : null, icon: Timer },
    { key: 'vertical', label: 'Vertical Jump', value: player.vertical, display: player.vertical ? `${player.vertical}"` : null, icon: TrendingUp },
    { key: 'benchReps', label: 'Bench Press', value: player.bench_reps, display: player.bench_reps ? `${player.bench_reps} reps` : null, icon: Activity },
    { key: 'broadJump', label: 'Broad Jump', value: null, display: player.broad_jump || null, icon: Zap },
    { key: 'shuttle', label: '20-Yard Shuttle', value: player.shuttle, display: player.shuttle ? `${player.shuttle}s` : null, icon: Timer },
    { key: 'threeCone', label: '3-Cone Drill', value: player.three_cone, display: player.three_cone ? `${player.three_cone}s` : null, icon: Timer },
  ];

  const needsFit = (() => {
    if (!currentTeam) return null;
    const posMap: Record<string, string[]> = {
      QB: ['QB'], RB: ['RB'], WR: ['WR'], TE: ['TE'],
      OT: ['OT', 'OL'], OL: ['OL', 'OT'],
      DT: ['DT', 'DL'], DL: ['DL', 'DT'],
      EDGE: ['EDGE', 'DL'], LB: ['LB'],
      CB: ['CB', 'DB'], S: ['S', 'DB'],
    };
    const playerPositions = posMap[player.position] || [player.position];
    return currentTeam.needs.some(need => playerPositions.includes(need));
  })();

  const getGradeLabel = (grade: number) => {
    if (grade >= 90) return { label: 'Elite Prospect', color: 'text-emerald-400', bg: 'from-emerald-500/30 to-emerald-900/20' };
    if (grade >= 80) return { label: 'Top Prospect', color: 'text-green-400', bg: 'from-green-500/30 to-green-900/20' };
    if (grade >= 70) return { label: 'Solid Starter', color: 'text-blue-400', bg: 'from-blue-500/30 to-blue-900/20' };
    if (grade >= 60) return { label: 'Day 2 Value', color: 'text-cyan-400', bg: 'from-cyan-500/30 to-cyan-900/20' };
    if (grade >= 50) return { label: 'Developmental', color: 'text-yellow-400', bg: 'from-yellow-500/30 to-yellow-900/20' };
    return { label: 'Project Player', color: 'text-orange-400', bg: 'from-orange-500/30 to-orange-900/20' };
  };

  const gradeInfo = getGradeLabel(player.grade);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-4">
            <div className={cn(
              "h-16 w-16 rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-xl bg-gradient-to-br",
              gradeInfo.bg
            )}>
              {player.grade}
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-2xl font-display leading-tight">{player.name}</DialogTitle>
              <DialogDescription className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge variant="secondary" className="font-mono text-xs">{player.position}</Badge>
                <span>{player.college}</span>
                <span className="text-muted-foreground">•</span>
                <span className={cn("font-medium", gradeInfo.color)}>{gradeInfo.label}</span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-muted/50 rounded-lg p-3 text-center border border-border/50">
              <Ruler className="h-4 w-4 mx-auto mb-1.5 text-muted-foreground" />
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Height</p>
              <p className="font-mono font-bold text-sm">{player.height}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center border border-border/50">
              <Weight className="h-4 w-4 mx-auto mb-1.5 text-muted-foreground" />
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Weight</p>
              <p className="font-mono font-bold text-sm">{player.weight} lbs</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center border border-border/50">
              <Award className="h-4 w-4 mx-auto mb-1.5 text-primary" />
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Grade</p>
              <p className="font-mono font-bold text-sm text-primary">{player.grade}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center border border-border/50">
              <Target className="h-4 w-4 mx-auto mb-1.5 text-muted-foreground" />
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Proj. Rnd</p>
              <p className="font-mono font-bold text-sm">Round {player.projected_round}</p>
            </div>
          </div>

          {hasCombineData && (
            <div>
              <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                <Activity className="h-4 w-4" /> Combine / Pro Day Measurables
              </h4>
              <div className="space-y-2">
                {combineStats.map(stat => {
                  const StatIcon = stat.icon;
                  const perc = getStatPercentile(stat.key, stat.value);
                  return (
                    <div key={stat.key} className="flex items-center gap-3 bg-muted/30 rounded-lg px-3 py-2 border border-border/30">
                      <StatIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-sm text-muted-foreground w-28 shrink-0">{stat.label}</span>
                      <span className={cn("font-mono font-bold text-sm flex-1", stat.display ? "text-foreground" : "text-muted-foreground/40")}>
                        {stat.display || '—'}
                      </span>
                      {perc && (
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full",
                                perc.percentile >= 80 ? "bg-emerald-500" :
                                perc.percentile >= 55 ? "bg-blue-500" :
                                perc.percentile >= 30 ? "bg-yellow-500" : "bg-red-500"
                              )}
                              style={{ width: `${perc.percentile}%` }}
                            />
                          </div>
                          <span className={cn("text-[10px] font-medium w-14 text-right", perc.color)}>
                            {perc.label}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {!hasCombineData && (
            <div className="bg-muted/20 rounded-lg border border-border/50 p-4 text-center">
              <Activity className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">No combine data available yet</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Measurables will appear after the {sport === "NFL" ? "NFL Combine" : "NBA Draft Combine"} or Pro Day</p>
            </div>
          )}

          {currentTeam && needsFit !== null && (
            <div className={cn(
              "rounded-lg border p-3",
              needsFit ? "bg-green-500/10 border-green-500/30" : "bg-muted/30 border-border/50"
            )}>
              <div className="flex items-center gap-2">
                {needsFit ? (
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Fills Need
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs text-muted-foreground">
                    <Minus className="h-3 w-3 mr-1" /> BPA Pick
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground ml-auto">
                  {currentTeam.name} needs: {currentTeam.needs.map((n, i) => (
                    <span key={n}>
                      {i > 0 && ', '}
                      <span className={cn(
                        "font-mono",
                        n === player.position || (n === 'OL' && player.position === 'OT') || (n === 'DL' && (player.position === 'DT' || player.position === 'EDGE'))
                          ? "text-green-400 font-bold" : ""
                      )}>{n}</span>
                    </span>
                  ))}
                </span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="mt-2 gap-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)} data-testid="button-close-player-stats">
            Close
          </Button>
          {canDraft && (
            <Button
              onClick={() => onDraft(player)}
              className="gap-2 shadow-[0_0_15px_hsl(var(--primary)/0.4)]"
              data-testid="button-draft-from-stats"
            >
              <CheckCircle2 className="h-4 w-4" />
              Draft {player.name.split(' ').pop()}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BigBoardView({
  picks,
  selectedRounds,
  teamsMap,
  teamControllers,
  activeRoundTab,
  setActiveRoundTab,
  roundTabs,
}: {
  picks: Pick[];
  selectedRounds: number;
  teamsMap: Record<string, Team>;
  teamControllers: TeamControllers;
  activeRoundTab: string;
  setActiveRoundTab: (tab: string) => void;
  roundTabs: { value: string; label: string }[];
}) {
  const [selectedPick, setSelectedPick] = useState<Pick | null>(null);

  const userTeams = useMemo(() => {
    const teams = new Set<string>();
    Object.entries(teamControllers).forEach(([code, ctrl]) => {
      if (ctrl.type === 'USER') teams.add(code);
    });
    return teams;
  }, [teamControllers]);

  const displayPicks = useMemo(() => {
    if (activeRoundTab === "all") return picks;
    const round = parseInt(activeRoundTab);
    return picks.filter(p => p.round === round);
  }, [picks, activeRoundTab]);

  const getPositionColor = (pos: string) => {
    const colors: Record<string, string> = {
      QB: 'from-red-500/30 to-red-900/20 border-red-500/40',
      RB: 'from-cyan-500/30 to-cyan-900/20 border-cyan-500/40',
      WR: 'from-orange-500/30 to-orange-900/20 border-orange-500/40',
      TE: 'from-yellow-500/30 to-yellow-900/20 border-yellow-500/40',
      OT: 'from-indigo-500/30 to-indigo-900/20 border-indigo-500/40',
      OL: 'from-indigo-500/30 to-indigo-900/20 border-indigo-500/40',
      DT: 'from-emerald-500/30 to-emerald-900/20 border-emerald-500/40',
      DL: 'from-emerald-500/30 to-emerald-900/20 border-emerald-500/40',
      EDGE: 'from-pink-500/30 to-pink-900/20 border-pink-500/40',
      LB: 'from-violet-500/30 to-violet-900/20 border-violet-500/40',
      CB: 'from-sky-500/30 to-sky-900/20 border-sky-500/40',
      S: 'from-teal-500/30 to-teal-900/20 border-teal-500/40',
    };
    return colors[pos] || 'from-gray-500/30 to-gray-900/20 border-gray-500/40';
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 gap-3">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-3">
          <h2 className="text-base sm:text-xl font-display font-bold tracking-tight flex items-center gap-2">
            <LayoutGrid className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            Big Board
          </h2>
          <Badge variant="secondary" className="text-[10px] sm:text-xs">{displayPicks.length} picks</Badge>
        </div>
        {selectedRounds > 1 && (
          <div className="flex gap-1 flex-wrap">
            {roundTabs.map(tab => (
              <Button
                key={tab.value}
                variant={activeRoundTab === tab.value ? "default" : "ghost"}
                size="sm"
                className="h-6 sm:h-7 text-[10px] sm:text-xs px-2 sm:px-3"
                onClick={() => setActiveRoundTab(tab.value)}
                data-testid={`button-bb-round-${tab.value}`}
              >
                {tab.label}
              </Button>
            ))}
          </div>
        )}
      </div>

      <ScrollArea className="flex-1 rounded-lg border border-border bg-gradient-to-br from-background via-background to-primary/5 p-2 sm:p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3">
          <AnimatePresence mode="popLayout">
            {displayPicks.map((pick) => {
              const team = teamsMap[pick.team];
              const isUser = userTeams.has(pick.team);
              const posColors = getPositionColor(pick.player?.position || '');

              return (
                <motion.div
                  key={`bb-${pick.round}-${pick.pick}`}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  layout
                  className={cn(
                    "relative rounded-lg border bg-gradient-to-br overflow-hidden group transition-all hover:scale-[1.03] hover:shadow-lg cursor-pointer",
                    posColors,
                    isUser && "ring-2 ring-primary ring-offset-1 ring-offset-background"
                  )}
                  onClick={() => setSelectedPick(pick)}
                  data-testid={`bb-pick-${pick.overall}`}
                >
                  <div className="absolute top-0 right-0 w-16 h-16 opacity-10">
                    <div
                      className="w-full h-full rounded-bl-full"
                      style={{ backgroundColor: team?.primaryColor || '#666' }}
                    />
                  </div>

                  <div className="p-3 space-y-1.5">
                    <div className="flex items-start justify-between">
                      <span className="text-3xl font-display font-black leading-none text-white/90" data-testid={`bb-pick-number-${pick.overall}`}>
                        {pick.overall}
                      </span>
                      <div
                        className="h-8 w-8 rounded-full flex items-center justify-center text-[8px] font-bold text-white shrink-0 shadow-md border border-white/20"
                        style={{ backgroundColor: team?.primaryColor || '#666' }}
                      >
                        {pick.team}
                      </div>
                    </div>

                    <div className="space-y-0.5 min-h-[3rem]">
                      <p className="font-bold text-sm leading-tight text-white truncate" title={pick.player?.name}>
                        {pick.player?.name}
                      </p>
                      <div className="flex items-center gap-1.5">
                        <Badge className="bg-black/30 text-white border-white/20 text-[9px] h-4 px-1 font-mono uppercase">
                          {pick.player?.position}
                        </Badge>
                        {isUser && (
                          <Badge className="bg-primary/40 text-primary-foreground border-primary/50 text-[8px] h-3.5 px-1">
                            <User className="h-2 w-2 mr-0.5" />YOU
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-0.5">
                      <span className="text-[10px] text-white/60 truncate max-w-[70%]" title={pick.player?.college}>
                        {pick.player?.college}
                      </span>
                      <span className="text-xs font-mono font-bold text-white/80">
                        R{pick.round}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {displayPicks.length === 0 && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center space-y-2">
              <LayoutGrid className="h-12 w-12 mx-auto text-muted-foreground/30" />
              <p className="text-muted-foreground text-lg">No picks yet</p>
              <p className="text-muted-foreground/60 text-sm">Start the draft to see picks appear on the Big Board</p>
            </div>
          </div>
        )}
      </ScrollArea>

      {selectedPick && (
        <PickDetailModal
          pick={selectedPick}
          team={teamsMap[selectedPick.team]}
          isUserPick={userTeams.has(selectedPick.team)}
          controllerName={teamControllers[selectedPick.team]?.name}
          open={!!selectedPick}
          onOpenChange={(open) => { if (!open) setSelectedPick(null); }}
        />
      )}
    </div>
  );
}

function PickDetailModal({
  pick,
  team,
  isUserPick,
  controllerName,
  open,
  onOpenChange,
}: {
  pick: Pick;
  team?: Team;
  isUserPick: boolean;
  controllerName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const player = pick.player;
  if (!player) return null;

  const projectedPickRange = (() => {
    const r = player.projected_round;
    const low = (r - 1) * 32 + 1;
    const high = r * 32;
    return { low, high, round: r };
  })();

  const reachAnalysis = (() => {
    const diff = pick.overall - projectedPickRange.low;
    if (diff < -16) return { label: 'Major Reach', color: 'text-red-400', bgColor: 'bg-red-500/20 border-red-500/30', icon: TrendingUp, description: `Drafted ${Math.abs(diff)} picks ahead of projected range. This is a significant reach — the team may see elite upside others don't.` };
    if (diff < -4) return { label: 'Slight Reach', color: 'text-orange-400', bgColor: 'bg-orange-500/20 border-orange-500/30', icon: TrendingUp, description: `Drafted ${Math.abs(diff)} picks ahead of projected range. A modest reach but teams sometimes move early for their guy.` };
    if (diff <= 8) return { label: 'Good Value', color: 'text-green-400', bgColor: 'bg-green-500/20 border-green-500/30', icon: Target, description: `Drafted right within the projected range. Solid value pick that aligns with consensus rankings.` };
    if (diff <= 32) return { label: 'Great Value', color: 'text-emerald-400', bgColor: 'bg-emerald-500/20 border-emerald-500/30', icon: TrendingDown, description: `Fell ${diff} picks below projected range. This is a steal — a premium talent at a discount slot.` };
    return { label: 'Steal', color: 'text-cyan-400', bgColor: 'bg-cyan-500/20 border-cyan-500/30', icon: Zap, description: `Fell ${diff}+ picks below projected range. An absolute steal that could define the draft class.` };
  })();

  const needsFit = (() => {
    if (!team) return { fits: false, message: 'Unknown team' };
    const posMap: Record<string, string[]> = {
      QB: ['QB'], RB: ['RB'], WR: ['WR'], TE: ['TE'],
      OT: ['OT', 'OL'], OL: ['OL', 'OT'],
      DT: ['DT', 'DL'], DL: ['DL', 'DT'],
      EDGE: ['EDGE', 'DL'], LB: ['LB'],
      CB: ['CB', 'DB'], S: ['S', 'DB'],
    };
    const playerPositions = posMap[player.position] || [player.position];
    const fits = team.needs.some(need => playerPositions.includes(need));
    return { fits, message: fits
      ? `${player.position} is a team need for ${team.name}. This pick directly addresses a roster gap.`
      : `${player.position} is not a listed need. ${team.name} needs: ${team.needs.join(', ')}. This is a best-player-available selection.`
    };
  })();

  const ReachIcon = reachAnalysis.icon;

  const combineStats = [
    { label: 'Height', value: player.height, icon: Ruler },
    { label: 'Weight', value: `${player.weight} lbs`, icon: Weight },
    { label: '40-Yard', value: player.forty_time ? `${player.forty_time}s` : null, icon: Timer },
    { label: 'Vertical', value: player.vertical ? `${player.vertical}"` : null, icon: TrendingUp },
    { label: 'Bench', value: player.bench_reps ? `${player.bench_reps} reps` : null, icon: Activity },
    { label: 'Broad Jump', value: player.broad_jump || null, icon: Zap },
    { label: 'Shuttle', value: player.shuttle ? `${player.shuttle}s` : null, icon: Timer },
    { label: '3-Cone', value: player.three_cone ? `${player.three_cone}s` : null, icon: Timer },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-4">
            <div
              className="h-14 w-14 rounded-full flex items-center justify-center text-lg font-bold text-white shrink-0 shadow-lg border-2 border-white/20"
              style={{ backgroundColor: team?.primaryColor || '#666' }}
            >
              {pick.team}
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-2xl font-display leading-tight">{player.name}</DialogTitle>
              <DialogDescription className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="font-mono text-xs">{player.position}</Badge>
                <span>{player.college}</span>
                <span className="text-muted-foreground">•</span>
                <span className="font-mono">Pick #{pick.overall}</span>
                <span className="text-muted-foreground">•</span>
                <span>R{pick.round} P{pick.pick}</span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          <div className={cn("rounded-lg border p-4", reachAnalysis.bgColor)}>
            <div className="flex items-center gap-2 mb-2">
              <ReachIcon className={cn("h-5 w-5", reachAnalysis.color)} />
              <span className={cn("font-display font-bold text-lg", reachAnalysis.color)}>{reachAnalysis.label}</span>
              {isUserPick && (
                <Badge className="bg-primary/30 text-primary border-primary/40 text-[10px] ml-auto">
                  <User className="h-2.5 w-2.5 mr-1" />{controllerName || 'User'} Pick
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{reachAnalysis.description}</p>
            <div className="flex items-center gap-4 mt-3 text-xs">
              <div className="bg-black/20 rounded px-2 py-1">
                <span className="text-muted-foreground">Drafted: </span>
                <span className="font-mono font-bold">#{pick.overall}</span>
              </div>
              <div className="bg-black/20 rounded px-2 py-1">
                <span className="text-muted-foreground">Projected: </span>
                <span className="font-mono font-bold">R{projectedPickRange.round} (#{projectedPickRange.low}-{projectedPickRange.high})</span>
              </div>
              <div className="bg-black/20 rounded px-2 py-1">
                <span className="text-muted-foreground">Grade: </span>
                <span className="font-mono font-bold text-primary">{player.grade}</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">
              <Target className="h-4 w-4" /> Team Needs Fit
            </h4>
            <div className={cn(
              "rounded-lg border p-3",
              needsFit.fits ? "bg-green-500/10 border-green-500/30" : "bg-yellow-500/10 border-yellow-500/30"
            )}>
              <div className="flex items-center gap-2 mb-1.5">
                {needsFit.fits ? (
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Fills Need
                  </Badge>
                ) : (
                  <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">
                    <Minus className="h-3 w-3 mr-1" /> BPA Pick
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground ml-auto">
                  Needs: {team?.needs.map((n, i) => (
                    <span key={n}>
                      {i > 0 && ', '}
                      <span className={cn(
                        "font-mono",
                        n === player.position || (n === 'OL' && player.position === 'OT') || (n === 'DL' && (player.position === 'DT' || player.position === 'EDGE'))
                          ? "text-green-400 font-bold"
                          : ""
                      )}>{n}</span>
                    </span>
                  ))}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{needsFit.message}</p>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">
              <Activity className="h-4 w-4" /> Combine Measurements
            </h4>
            <div className="grid grid-cols-4 gap-2">
              {combineStats.map(stat => {
                const StatIcon = stat.icon;
                return (
                  <div key={stat.label} className="bg-muted/40 rounded-lg p-2.5 text-center border border-border/50">
                    <StatIcon className="h-3.5 w-3.5 mx-auto mb-1 text-muted-foreground" />
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{stat.label}</p>
                    <p className={cn("font-mono font-bold text-sm", stat.value ? "text-foreground" : "text-muted-foreground/40")}>
                      {stat.value || '—'}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter className="mt-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)} data-testid="button-close-detail">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface PickGrade {
  pick: Pick;
  valueScore: number;
  needBonus: number;
  talentScore: number;
  pickGrade: number;
  label: string;
  needPriority: number | null;
}

interface RoundGrade {
  round: number;
  score: number;
  pickCount: number;
}

interface TeamGrade {
  teamCode: string;
  teamName: string;
  primaryColor: string;
  letterGrade: string;
  score: number;
  picks: Pick[];
  pickGrades: PickGrade[];
  valueScore: number;
  needScore: number;
  talentScore: number;
  bestPick: Pick | null;
  worstPick: Pick | null;
  needsHit: number;
  needsTotal: number;
  isUser: boolean;
  summary: string;
  offenseScore: number;
  defenseScore: number;
  offensePicks: number;
  defensePicks: number;
  stealCount: number;
  reachCount: number;
  bpaPercent: number;
  needPercent: number;
  roundGrades: RoundGrade[];
  positionBreakdown: Record<string, number>;
  avgPickGrade: number;
  rank: number;
  totalTeams: number;
}

function getPickValueLabel(diff: number): string {
  if (diff >= 40) return 'Massive Steal';
  if (diff >= 20) return 'Great Value';
  if (diff >= 8) return 'Good Value';
  if (diff >= 0) return 'Fair Pick';
  if (diff >= -8) return 'Slight Reach';
  if (diff >= -20) return 'Reach';
  return 'Big Reach';
}

function calculateTeamGrades(
  picks: Pick[],
  teamsMap: Record<string, Team>,
  teamControllers: TeamControllers
): TeamGrade[] {
  const posMap: Record<string, string[]> = {
    QB: ['QB'], RB: ['RB'], WR: ['WR'], TE: ['TE'],
    OT: ['OT', 'OL'], OL: ['OL', 'OT', 'G', 'C'],
    G: ['OL', 'G'], C: ['OL', 'C'],
    DT: ['DT', 'DL'], DL: ['DL', 'DT', 'EDGE'],
    EDGE: ['EDGE', 'DL'], LB: ['LB'],
    CB: ['CB', 'DB'], S: ['S', 'DB'], DB: ['CB', 'S', 'DB'],
    PG: ['PG'], SG: ['SG'], SF: ['SF'], PF: ['PF'],
  };

  const offensePositions = new Set(['QB', 'RB', 'WR', 'TE', 'OT', 'OL', 'G', 'C', 'PG', 'SG', 'SF', 'PF']);
  const defensePositions = new Set(['DT', 'DL', 'EDGE', 'LB', 'CB', 'S', 'DB']);

  const teamPicks: Record<string, Pick[]> = {};
  picks.forEach(p => {
    if (!teamPicks[p.team]) teamPicks[p.team] = [];
    teamPicks[p.team].push(p);
  });

  const grades: TeamGrade[] = [];

  const allPlayerGrades = picks.filter(p => p.player).map(p => p.player!.grade);
  const maxGrade = Math.max(...allPlayerGrades, 95);
  const minGrade = Math.min(...allPlayerGrades, 50);
  const gradeRange = maxGrade - minGrade || 1;

  Object.entries(teamPicks).forEach(([teamCode, teamPickList]) => {
    const team = teamsMap[teamCode];
    if (!team) return;

    let valueTotalWeighted = 0;
    let needTotalWeighted = 0;
    let talentTotalWeighted = 0;
    let weightSum = 0;
    let needHits = 0;
    let bestPickScore = -Infinity;
    let worstPickScore = Infinity;
    let bestPick: Pick | null = null;
    let worstPick: Pick | null = null;
    let stealCount = 0;
    let reachCount = 0;
    let offenseWeightedTotal = 0;
    let offenseWeightSum = 0;
    let defenseWeightedTotal = 0;
    let defenseWeightSum = 0;
    let offensePicks = 0;
    let defensePicks = 0;
    const positionBreakdown: Record<string, number> = {};
    const roundScores: Record<number, { total: number; count: number }> = {};
    const pickGradesList: PickGrade[] = [];

    teamPickList.forEach(pick => {
      if (!pick.player) return;

      const pickWeight = pick.round === 1 ? 3 : pick.round === 2 ? 2 : pick.round === 3 ? 1.5 : 1;

      const projectedOverall = (pick.player.projected_round - 1) * 32 + 16;
      const diff = projectedOverall - pick.overall;

      let valueScore: number;
      if (diff >= 40) valueScore = 98;
      else if (diff >= 20) valueScore = 90;
      else if (diff >= 8) valueScore = 80;
      else if (diff >= 0) valueScore = 70;
      else if (diff >= -8) valueScore = 55;
      else if (diff >= -20) valueScore = 40;
      else if (diff >= -40) valueScore = 25;
      else valueScore = 15;

      if (diff >= 20) stealCount++;
      if (diff <= -8) reachCount++;

      const normalizedTalent = ((pick.player.grade - minGrade) / gradeRange) * 60 + 40;
      const talentScore = Math.min(Math.round(normalizedTalent), 100);

      const playerPositions = posMap[pick.player.position] || [pick.player.position];
      let needPriority: number | null = null;
      for (let i = 0; i < team.needs.length; i++) {
        if (playerPositions.includes(team.needs[i])) {
          needPriority = i;
          break;
        }
      }
      const isNeedHit = needPriority !== null;
      if (isNeedHit) needHits++;

      let needBonus: number;
      if (needPriority === 0) needBonus = 100;
      else if (needPriority === 1) needBonus = 85;
      else if (needPriority === 2) needBonus = 70;
      else if (needPriority !== null) needBonus = 55;
      else needBonus = 20;

      const pickScore = Math.round(valueScore * 0.35 + needBonus * 0.35 + talentScore * 0.30);

      valueTotalWeighted += valueScore * pickWeight;
      needTotalWeighted += needBonus * pickWeight;
      talentTotalWeighted += talentScore * pickWeight;
      weightSum += pickWeight;

      const pos = pick.player.position;
      if (offensePositions.has(pos)) {
        offenseWeightedTotal += pickScore * pickWeight;
        offenseWeightSum += pickWeight;
        offensePicks++;
      } else if (defensePositions.has(pos)) {
        defenseWeightedTotal += pickScore * pickWeight;
        defenseWeightSum += pickWeight;
        defensePicks++;
      }

      positionBreakdown[pos] = (positionBreakdown[pos] || 0) + 1;

      if (!roundScores[pick.round]) roundScores[pick.round] = { total: 0, count: 0 };
      roundScores[pick.round].total += pickScore;
      roundScores[pick.round].count++;

      if (pickScore > bestPickScore) {
        bestPickScore = pickScore;
        bestPick = pick;
      }
      if (pickScore < worstPickScore) {
        worstPickScore = pickScore;
        worstPick = pick;
      }

      pickGradesList.push({
        pick,
        valueScore,
        needBonus,
        talentScore,
        pickGrade: pickScore,
        label: getPickValueLabel(diff),
        needPriority,
      });
    });

    const pickCount = teamPickList.filter(p => p.player).length;
    if (pickCount === 0) return;

    const valueAvg = Math.round(valueTotalWeighted / weightSum);
    const needAvg = Math.round(needTotalWeighted / weightSum);
    const talentAvg = Math.round(talentTotalWeighted / weightSum);

    const overallScore = Math.round(valueAvg * 0.35 + needAvg * 0.35 + talentAvg * 0.30);

    const offenseScore = offenseWeightSum > 0 ? Math.round(offenseWeightedTotal / offenseWeightSum) : 0;
    const defenseScore = defenseWeightSum > 0 ? Math.round(defenseWeightedTotal / defenseWeightSum) : 0;

    const roundGrades: RoundGrade[] = Object.entries(roundScores)
      .map(([r, data]) => ({ round: parseInt(r), score: Math.round(data.total / data.count), pickCount: data.count }))
      .sort((a, b) => a.round - b.round);

    const bpaPercent = pickCount > 0 ? Math.round(((pickCount - needHits) / pickCount) * 100) : 0;
    const needPercent = pickCount > 0 ? Math.round((needHits / pickCount) * 100) : 0;

    const avgPickGrade = pickGradesList.length > 0
      ? Math.round(pickGradesList.reduce((s, pg) => s + pg.pickGrade, 0) / pickGradesList.length)
      : 0;

    let letterGrade: string;
    if (overallScore >= 90) letterGrade = 'A+';
    else if (overallScore >= 85) letterGrade = 'A';
    else if (overallScore >= 80) letterGrade = 'A-';
    else if (overallScore >= 75) letterGrade = 'B+';
    else if (overallScore >= 70) letterGrade = 'B';
    else if (overallScore >= 65) letterGrade = 'B-';
    else if (overallScore >= 60) letterGrade = 'C+';
    else if (overallScore >= 55) letterGrade = 'C';
    else if (overallScore >= 50) letterGrade = 'C-';
    else if (overallScore >= 45) letterGrade = 'D+';
    else if (overallScore >= 40) letterGrade = 'D';
    else if (overallScore >= 35) letterGrade = 'D-';
    else letterGrade = 'F';

    const stealStr = stealCount > 0 ? `${stealCount} steal${stealCount > 1 ? 's' : ''}` : '';
    const reachStr = reachCount > 0 ? `${reachCount} reach${reachCount > 1 ? 'es' : ''}` : '';
    const posEntries = Object.entries(positionBreakdown).sort((a, b) => b[1] - a[1]);
    const topPos = posEntries.length > 0 ? posEntries[0] : null;
    const sideLabel = offensePicks > defensePicks ? 'offense-heavy' : offensePicks < defensePicks ? 'defense-heavy' : 'balanced';

    let summary = '';
    if (overallScore >= 80) {
      summary = `Excellent draft class. ${needHits}/${pickCount} picks filled needs with strong value.`;
      if (stealStr) summary += ` Found ${stealStr}.`;
      summary += ` ${sideLabel.charAt(0).toUpperCase() + sideLabel.slice(1)} approach${topPos ? ` favoring ${topPos[0]}` : ''}.`;
    } else if (overallScore >= 65) {
      summary = `Solid draft.`;
      if (needHits < pickCount / 2) summary += ` Could have addressed more needs (${needHits}/${pickCount}).`;
      else summary += ` Good need-targeting with ${needHits}/${pickCount} hits.`;
      if (stealStr) summary += ` ${stealStr}.`;
      if (reachStr) summary += ` ${reachStr}.`;
    } else if (overallScore >= 50) {
      summary = `Average draft.`;
      if (needHits < pickCount / 2) summary += ` Only ${needHits}/${pickCount} picks addressed team needs.`;
      if (reachStr) summary += ` ${reachStr} hurt the grade.`;
      if (stealStr) summary += ` Did find ${stealStr}.`;
    } else {
      summary = `Below-average class.`;
      if (reachStr) summary += ` ${reachStr} significantly hurt value.`;
      summary += ` Only ${needHits}/${pickCount} needs addressed.`;
    }

    grades.push({
      teamCode,
      teamName: team.name,
      primaryColor: team.primaryColor,
      letterGrade,
      score: overallScore,
      picks: teamPickList,
      pickGrades: pickGradesList.sort((a, b) => a.pick.overall - b.pick.overall),
      valueScore: valueAvg,
      needScore: needAvg,
      talentScore: talentAvg,
      bestPick,
      worstPick,
      needsHit: needHits,
      needsTotal: pickCount,
      isUser: teamControllers[teamCode]?.type === 'USER',
      summary,
      offenseScore,
      defenseScore,
      offensePicks,
      defensePicks,
      stealCount,
      reachCount,
      bpaPercent,
      needPercent,
      roundGrades,
      positionBreakdown,
      avgPickGrade,
      rank: 0,
      totalTeams: 0,
    });
  });

  grades.sort((a, b) => b.score - a.score);
  const totalTeams = grades.length;
  grades.forEach((g, i) => {
    g.rank = i + 1;
    g.totalTeams = totalTeams;
  });
  return grades;
}

function getGradeColor(grade: string): string {
  if (grade.startsWith('A')) return 'text-emerald-400';
  if (grade.startsWith('B')) return 'text-green-400';
  if (grade.startsWith('C')) return 'text-yellow-400';
  if (grade.startsWith('D')) return 'text-orange-400';
  return 'text-red-400';
}

function getGradeBg(grade: string): string {
  if (grade.startsWith('A')) return 'bg-emerald-500/20 border-emerald-500/40';
  if (grade.startsWith('B')) return 'bg-green-500/20 border-green-500/40';
  if (grade.startsWith('C')) return 'bg-yellow-500/20 border-yellow-500/40';
  if (grade.startsWith('D')) return 'bg-orange-500/20 border-orange-500/40';
  return 'bg-red-500/20 border-red-500/40';
}

function getValueLabelColor(label: string): string {
  if (label.includes('Massive') || label.includes('Great')) return 'text-emerald-400';
  if (label.includes('Good')) return 'text-green-400';
  if (label.includes('Fair')) return 'text-blue-400';
  if (label.includes('Slight')) return 'text-yellow-400';
  if (label === 'Reach') return 'text-orange-400';
  return 'text-red-400';
}

function GradeDistributionBar({ grades }: { grades: TeamGrade[] }) {
  const distribution = useMemo(() => {
    const buckets: Record<string, number> = { 'A': 0, 'B': 0, 'C': 0, 'D': 0, 'F': 0 };
    grades.forEach(g => {
      const letter = g.letterGrade[0];
      buckets[letter] = (buckets[letter] || 0) + 1;
    });
    return Object.entries(buckets).filter(([, v]) => v > 0);
  }, [grades]);

  const total = grades.length;
  const colors: Record<string, string> = {
    A: 'bg-emerald-500', B: 'bg-green-500', C: 'bg-yellow-500', D: 'bg-orange-500', F: 'bg-red-500',
  };

  return (
    <div className="space-y-1.5">
      <div className="flex h-4 rounded-full overflow-hidden border border-border">
        {distribution.map(([letter, count]) => (
          <div
            key={letter}
            className={cn("flex items-center justify-center text-[9px] font-bold text-white transition-all", colors[letter])}
            style={{ width: `${(count / total) * 100}%` }}
            title={`${letter}: ${count} team${count > 1 ? 's' : ''}`}
          >
            {count > 1 && `${letter}:${count}`}
          </div>
        ))}
      </div>
      <div className="flex justify-center gap-3">
        {distribution.map(([letter, count]) => (
          <div key={letter} className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <div className={cn("h-2 w-2 rounded-full", colors[letter])} />
            {letter}: {count}
          </div>
        ))}
      </div>
    </div>
  );
}

function RoundSparkline({ roundGrades }: { roundGrades: RoundGrade[] }) {
  if (roundGrades.length <= 1) return null;
  const maxScore = Math.max(...roundGrades.map(r => r.score), 100);
  const minScore = Math.min(...roundGrades.map(r => r.score), 0);
  const range = maxScore - minScore || 1;
  const height = 32;
  const width = roundGrades.length * 28;

  const points = roundGrades.map((r, i) => {
    const x = i * 28 + 14;
    const y = height - ((r.score - minScore) / range) * (height - 8) - 4;
    return { x, y, score: r.score, round: r.round };
  });

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-muted-foreground shrink-0">By Round:</span>
      <svg width={width} height={height} className="shrink-0">
        <path d={pathD} fill="none" stroke="hsl(var(--primary))" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="3" fill="hsl(var(--primary))" />
            <text x={p.x} y={height} textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: '8px' }}>R{p.round}</text>
          </g>
        ))}
      </svg>
      <div className="flex gap-1.5 flex-wrap">
        {roundGrades.map(r => (
          <span key={r.round} className="text-[10px] font-mono text-muted-foreground">
            R{r.round}:<span className={cn("font-medium ml-0.5", r.score >= 70 ? "text-emerald-400" : r.score >= 50 ? "text-yellow-400" : "text-orange-400")}>{r.score}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function DraftGradesDialog({
  open,
  onOpenChange,
  picks,
  teamsMap,
  teamControllers,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  picks: Pick[];
  teamsMap: Record<string, Team>;
  teamControllers: TeamControllers;
}) {
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'score' | 'name' | 'value' | 'need' | 'steals' | 'offense' | 'defense'>('score');

  const grades = useMemo(() => calculateTeamGrades(picks, teamsMap, teamControllers), [picks, teamsMap, teamControllers]);

  const sortedGrades = useMemo(() => {
    const sorted = [...grades];
    switch (sortBy) {
      case 'name': sorted.sort((a, b) => a.teamName.localeCompare(b.teamName)); break;
      case 'value': sorted.sort((a, b) => b.valueScore - a.valueScore); break;
      case 'need': sorted.sort((a, b) => b.needScore - a.needScore); break;
      case 'steals': sorted.sort((a, b) => b.stealCount - a.stealCount || b.score - a.score); break;
      case 'offense': sorted.sort((a, b) => b.offenseScore - a.offenseScore || b.score - a.score); break;
      case 'defense': sorted.sort((a, b) => b.defenseScore - a.defenseScore || b.score - a.score); break;
      default: sorted.sort((a, b) => b.score - a.score);
    }
    return sorted;
  }, [grades, sortBy]);

  const avgScore = grades.length > 0 ? Math.round(grades.reduce((s, g) => s + g.score, 0) / grades.length) : 0;
  const topGrade = grades[0];
  const bottomGrade = grades[grades.length - 1];
  const userGrades = grades.filter(g => g.isUser);
  const totalSteals = grades.reduce((s, g) => s + g.stealCount, 0);
  const totalReaches = grades.reduce((s, g) => s + g.reachCount, 0);

  const handleExportGradesCSV = useCallback(() => {
    const summaryHeaders = ['Rank', 'Team', 'Team Name', 'Grade', 'Score', 'Value Score', 'Need Score', 'Talent Score', 'Offense Score', 'Defense Score', 'Offense Picks', 'Defense Picks', 'Needs Hit', 'Total Needs', 'Steals', 'Reaches', 'BPA %', 'Need %', 'Best Pick', 'Worst Pick', 'Summary'];
    const summaryRows = sortedGrades.map(g => [
      g.rank,
      g.teamCode,
      g.teamName,
      g.letterGrade,
      g.score,
      g.valueScore,
      g.needScore,
      g.talentScore,
      g.offenseScore,
      g.defenseScore,
      g.offensePicks,
      g.defensePicks,
      g.needsHit,
      g.needsTotal,
      g.stealCount,
      g.reachCount,
      g.bpaPercent,
      g.needPercent,
      g.bestPick?.player?.name || '',
      g.worstPick?.player?.name || '',
      g.summary,
    ]);

    const pickHeaders = ['', '', 'PICK DETAILS'];
    const pickColHeaders = ['Team', 'Round', 'Overall Pick', 'Player', 'Position', 'College', 'Player Grade', 'Pick Score', 'Value Score', 'Need Bonus', 'Talent Score', 'Value Label', 'Need Priority'];
    const pickRows: (string | number)[][] = [];
    sortedGrades.forEach(g => {
      g.pickGrades.forEach(pg => {
        pickRows.push([
          g.teamCode,
          pg.pick.round,
          pg.pick.overall,
          pg.pick.player?.name || '',
          pg.pick.player?.position || '',
          pg.pick.player?.college || '',
          pg.pick.player?.grade || '',
          pg.pickGrade,
          pg.valueScore,
          pg.needBonus,
          pg.talentScore,
          pg.label,
          pg.needPriority !== null ? pg.needPriority + 1 : '',
        ]);
      });
    });

    const escapeCSV = (cell: string | number) => {
      const str = String(cell);
      return str.includes(',') || str.includes('"') || str.includes('\n') ? `"${str.replace(/"/g, '""')}"` : str;
    };

    const lines = [
      `Draft Report Card - ${new Date().toLocaleDateString()}`,
      `League Average: ${avgScore} | Best: ${topGrade?.teamCode} (${topGrade?.letterGrade}) | Worst: ${bottomGrade?.teamCode} (${bottomGrade?.letterGrade}) | Steals: ${totalSteals} | Reaches: ${totalReaches}`,
      '',
      'TEAM GRADES',
      summaryHeaders.map(escapeCSV).join(','),
      ...summaryRows.map(row => row.map(escapeCSV).join(',')),
      '',
      'INDIVIDUAL PICK GRADES',
      pickColHeaders.map(escapeCSV).join(','),
      ...pickRows.map(row => row.map(escapeCSV).join(',')),
    ];

    const csv = lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `draft_grades_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [sortedGrades, avgScore, topGrade, bottomGrade, totalSteals, totalReaches]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-display flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              Draft Report Card
            </DialogTitle>
            <Button variant="outline" size="sm" className="gap-1.5 h-8" onClick={handleExportGradesCSV} data-testid="button-export-grades-csv">
              <Download className="h-3.5 w-3.5" /> Export CSV
            </Button>
          </div>
          <DialogDescription>
            Comprehensive team evaluation: value (35%), need fit (35%), talent (30%). Includes offense/defense splits, steals, reaches, and round-by-round analysis.
          </DialogDescription>
        </DialogHeader>

        <GradeDistributionBar grades={grades} />

        <div className="grid grid-cols-5 gap-2">
          <div className="bg-muted/50 rounded-lg p-2.5 text-center border border-border">
            <p className="text-[10px] text-muted-foreground mb-0.5">League Avg</p>
            <p className="text-xl font-bold font-display" data-testid="text-avg-score">{avgScore}</p>
          </div>
          {topGrade && (
            <div className="bg-emerald-500/10 rounded-lg p-2.5 text-center border border-emerald-500/30">
              <p className="text-[10px] text-muted-foreground mb-0.5">Best Draft</p>
              <p className="text-base font-bold truncate" data-testid="text-best-team">
                <span className={getGradeColor(topGrade.letterGrade)}>{topGrade.letterGrade}</span>
                {' '}<span className="text-xs font-normal">{topGrade.teamCode}</span>
              </p>
            </div>
          )}
          {bottomGrade && (
            <div className="bg-red-500/10 rounded-lg p-2.5 text-center border border-red-500/30">
              <p className="text-[10px] text-muted-foreground mb-0.5">Worst Draft</p>
              <p className="text-base font-bold truncate" data-testid="text-worst-team">
                <span className={getGradeColor(bottomGrade.letterGrade)}>{bottomGrade.letterGrade}</span>
                {' '}<span className="text-xs font-normal">{bottomGrade.teamCode}</span>
              </p>
            </div>
          )}
          <div className="bg-emerald-500/10 rounded-lg p-2.5 text-center border border-emerald-500/30">
            <p className="text-[10px] text-muted-foreground mb-0.5">Total Steals</p>
            <p className="text-xl font-bold text-emerald-400" data-testid="text-total-steals">{totalSteals}</p>
          </div>
          <div className="bg-orange-500/10 rounded-lg p-2.5 text-center border border-orange-500/30">
            <p className="text-[10px] text-muted-foreground mb-0.5">Total Reaches</p>
            <p className="text-xl font-bold text-orange-400" data-testid="text-total-reaches">{totalReaches}</p>
          </div>
        </div>

        {userGrades.length > 0 && (
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 flex items-center gap-4">
            <div className={cn("text-3xl font-display font-bold px-3 py-1 rounded-lg border", getGradeBg(userGrades[0].letterGrade), getGradeColor(userGrades[0].letterGrade))}>
              {userGrades[0].letterGrade}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-sm">Your Draft: {userGrades[0].teamName}</span>
                <Badge className="bg-primary/20 text-primary border-primary/30 text-[9px] h-4 px-1">
                  Rank #{userGrades[0].rank}/{userGrades[0].totalTeams}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>Score: {userGrades[0].score}/100</span>
                <span>Steals: {userGrades[0].stealCount}</span>
                <span>Reaches: {userGrades[0].reachCount}</span>
                <span>Needs: {userGrades[0].needsHit}/{userGrades[0].needsTotal}</span>
                <span>Strategy: {userGrades[0].needPercent}% Need / {userGrades[0].bpaPercent}% BPA</span>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-xs text-muted-foreground mr-1">Sort:</span>
          {([
            ['score', 'Overall'],
            ['name', 'Team'],
            ['value', 'Value'],
            ['need', 'Need Fit'],
            ['steals', 'Steals'],
            ['offense', 'Offense'],
            ['defense', 'Defense'],
          ] as const).map(([key, label]) => (
            <Button
              key={key}
              variant={sortBy === key ? 'default' : 'ghost'}
              size="sm"
              className="h-6 text-xs px-2"
              onClick={() => setSortBy(key as typeof sortBy)}
              data-testid={`button-sort-${key}`}
            >
              {label}
            </Button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 space-y-1 pr-1" style={{ maxHeight: '48vh' }}>
          {sortedGrades.map((g) => (
            <div key={g.teamCode} className="border border-border rounded-lg overflow-hidden" data-testid={`grade-card-${g.teamCode}`}>
              <button
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50",
                  g.isUser && "bg-primary/5 border-l-2 border-l-primary",
                  expandedTeam === g.teamCode && "bg-muted/30"
                )}
                onClick={() => setExpandedTeam(expandedTeam === g.teamCode ? null : g.teamCode)}
                data-testid={`button-expand-${g.teamCode}`}
              >
                <span className="text-xs text-muted-foreground font-mono w-5 text-right">
                  #{g.rank}
                </span>
                <div
                  className="h-8 w-8 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                  style={{ backgroundColor: g.primaryColor }}
                >
                  {g.teamCode}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">{g.teamName}</span>
                    {g.isUser && (
                      <Badge className="bg-primary/20 text-primary border-primary/30 text-[9px] h-4 px-1">
                        <User className="h-2.5 w-2.5 mr-0.5" /> YOU
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2.5 text-[11px] text-muted-foreground mt-0.5">
                    <span>{g.picks.length} pick{g.picks.length !== 1 ? 's' : ''}</span>
                    <span className="text-blue-400">Val:{g.valueScore}</span>
                    <span className="text-green-400">Need:{g.needsHit}/{g.needsTotal}</span>
                    <span className="text-purple-400">Tal:{g.talentScore}</span>
                    {g.stealCount > 0 && <span className="text-emerald-400">{g.stealCount} steal{g.stealCount > 1 ? 's' : ''}</span>}
                    {g.reachCount > 0 && <span className="text-orange-400">{g.reachCount} reach{g.reachCount > 1 ? 'es' : ''}</span>}
                  </div>
                </div>
                <div className={cn(
                  "text-2xl font-display font-bold px-3 py-1 rounded-lg border",
                  getGradeBg(g.letterGrade),
                  getGradeColor(g.letterGrade)
                )}>
                  {g.letterGrade}
                </div>
                <div className="text-sm font-mono text-muted-foreground w-8 text-right">
                  {g.score}
                </div>
                {expandedTeam === g.teamCode ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </button>

              {expandedTeam === g.teamCode && (
                <div className="border-t border-border bg-muted/20 px-4 py-3 space-y-3">
                  <p className="text-xs text-muted-foreground italic">{g.summary}</p>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground mb-1">Value (35%)</div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${g.valueScore}%` }} />
                      </div>
                      <div className="text-xs font-mono mt-1">{g.valueScore}/100</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground mb-1">Need Fit (35%)</div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${g.needScore}%` }} />
                      </div>
                      <div className="text-xs font-mono mt-1">{g.needsHit}/{g.needsTotal} hits</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground mb-1">Talent (30%)</div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-purple-500 rounded-full transition-all" style={{ width: `${g.talentScore}%` }} />
                      </div>
                      <div className="text-xs font-mono mt-1">{g.talentScore}/100</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-muted/30 rounded-lg p-2 border border-border/50">
                      <div className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1">
                        <Zap className="h-3 w-3" /> Offense ({g.offensePicks} pick{g.offensePicks !== 1 ? 's' : ''})
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-sky-500 rounded-full" style={{ width: `${g.offenseScore}%` }} />
                      </div>
                      <div className="text-xs font-mono mt-1">{g.offenseScore}/100</div>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-2 border border-border/50">
                      <div className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1">
                        <Target className="h-3 w-3" /> Defense ({g.defensePicks} pick{g.defensePicks !== 1 ? 's' : ''})
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-amber-500 rounded-full" style={{ width: `${g.defenseScore}%` }} />
                      </div>
                      <div className="text-xs font-mono mt-1">{g.defenseScore}/100</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground">Strategy:</span>
                      <div className="flex h-3 w-24 rounded-full overflow-hidden border border-border">
                        <div className="bg-green-500 h-full" style={{ width: `${g.needPercent}%` }} title={`Need: ${g.needPercent}%`} />
                        <div className="bg-blue-500 h-full" style={{ width: `${g.bpaPercent}%` }} title={`BPA: ${g.bpaPercent}%`} />
                      </div>
                      <span className="text-green-400">{g.needPercent}% Need</span>
                      <span className="text-blue-400">{g.bpaPercent}% BPA</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {Object.entries(g.positionBreakdown).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([pos, count]) => (
                        <span key={pos} className="font-mono">
                          <Badge variant="secondary" className="text-[8px] h-3.5 px-1 mr-0.5">{pos}</Badge>
                          <span className="text-muted-foreground">x{count}</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  <RoundSparkline roundGrades={g.roundGrades} />

                  {g.bestPick?.player && (
                    <div className="flex items-center gap-2 text-xs">
                      <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                      <span className="text-muted-foreground">Best pick:</span>
                      <span className="font-medium">{g.bestPick.player.name}</span>
                      <Badge variant="secondary" className="text-[9px] h-4 px-1">{g.bestPick.player.position}</Badge>
                      <span className="text-muted-foreground">at #{g.bestPick.overall}</span>
                    </div>
                  )}

                  {g.worstPick?.player && g.worstPick !== g.bestPick && (
                    <div className="flex items-center gap-2 text-xs">
                      <TrendingDown className="h-3.5 w-3.5 text-orange-400" />
                      <span className="text-muted-foreground">Biggest reach:</span>
                      <span className="font-medium">{g.worstPick.player.name}</span>
                      <Badge variant="secondary" className="text-[9px] h-4 px-1">{g.worstPick.player.position}</Badge>
                      <span className="text-muted-foreground">at #{g.worstPick.overall}</span>
                    </div>
                  )}

                  <div className="border-t border-border/50 pt-2">
                    <div className="text-xs text-muted-foreground mb-1.5">Pick-by-Pick Breakdown:</div>
                    <div className="space-y-1">
                      {g.pickGrades.map(pg => (
                        <div key={pg.pick.overall} className="flex items-center gap-2 text-xs bg-muted/30 rounded px-3 py-1.5 border border-border/30">
                          <span className="font-mono text-muted-foreground w-8 shrink-0">#{pg.pick.overall}</span>
                          <span className="font-medium truncate flex-1 min-w-0">{pg.pick.player?.name}</span>
                          <Badge variant="secondary" className="text-[8px] h-3.5 px-1 shrink-0">{pg.pick.player?.position}</Badge>
                          <span className={cn("text-[10px] font-medium shrink-0 w-20 text-right", getValueLabelColor(pg.label))}>
                            {pg.label}
                          </span>
                          {pg.needPriority !== null ? (
                            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-[8px] h-3.5 px-1 shrink-0">
                              Need #{pg.needPriority + 1}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[8px] h-3.5 px-1 text-muted-foreground shrink-0">
                              BPA
                            </Badge>
                          )}
                          <span className="font-mono text-muted-foreground w-6 text-right shrink-0">{pg.pickGrade}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)} data-testid="button-close-grades">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ComparisonDialog({
  open,
  onOpenChange,
  picks,
  selectedRounds,
  teamsMap,
  teamControllers,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  picks: Pick[];
  selectedRounds: number;
  teamsMap: Record<string, Team>;
  teamControllers: TeamControllers;
}) {
  const [compareRound, setCompareRound] = useState(1);

  const roundPicks = useMemo(() => {
    return picks.filter(p => p.round === compareRound);
  }, [picks, compareRound]);

  const userTeams = useMemo(() => {
    const teams = new Set<string>();
    Object.entries(teamControllers).forEach(([code, ctrl]) => {
      if (ctrl.type === 'USER') teams.add(code);
    });
    return teams;
  }, [teamControllers]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl font-display flex items-center gap-2">
            <Columns className="h-5 w-5 text-primary" />
            Draft Comparison
          </DialogTitle>
          <DialogDescription>
            Review your mock draft picks round by round. User-controlled teams are highlighted.
          </DialogDescription>
        </DialogHeader>

        {/* Round Tabs */}
        <div className="flex gap-1 flex-wrap">
          {Array.from({ length: selectedRounds }, (_, i) => i + 1).map(round => (
            <Button
              key={round}
              variant={compareRound === round ? "default" : "outline"}
              size="sm"
              onClick={() => setCompareRound(round)}
              data-testid={`button-compare-round-${round}`}
            >
              Round {round}
            </Button>
          ))}
        </div>

        <ScrollArea className="flex-1 border rounded-md">
          <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-muted/30 text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-border sticky top-0 z-10">
            <div className="col-span-1">Pick</div>
            <div className="col-span-2">Team</div>
            <div className="col-span-1">Ctrl</div>
            <div className="col-span-4">Your Pick</div>
            <div className="col-span-1">Pos</div>
            <div className="col-span-2">School</div>
            <div className="col-span-1 text-right">Grade</div>
          </div>
          <div className="divide-y divide-border/50">
            {roundPicks.map((pick) => {
              const isUserPick = userTeams.has(pick.team);
              return (
                <div
                  key={`${pick.round}-${pick.pick}`}
                  className={cn(
                    "grid grid-cols-12 gap-2 px-4 py-3 items-center text-sm transition-colors",
                    isUserPick ? "bg-primary/5 border-l-2 border-l-primary" : ""
                  )}
                  data-testid={`compare-pick-${pick.overall}`}
                >
                  <div className="col-span-1 font-mono font-bold text-muted-foreground">
                    {pick.pick}
                  </div>
                  <div className="col-span-2 flex items-center gap-2">
                    <div
                      className="h-6 w-6 rounded-full flex items-center justify-center text-[8px] font-bold text-white shrink-0"
                      style={{ backgroundColor: teamsMap[pick.team]?.primaryColor }}
                    >
                      {pick.team}
                    </div>
                    <span className="truncate text-xs">{teamsMap[pick.team]?.name}</span>
                  </div>
                  <div className="col-span-1">
                    {isUserPick ? (
                      <Badge className="bg-primary/20 text-primary border-primary/30 text-[9px] h-4 px-1">
                        <User className="h-2.5 w-2.5 mr-0.5" />
                        {teamControllers[pick.team]?.name || "User"}
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[9px] h-4 px-1">
                        <Monitor className="h-2.5 w-2.5 mr-0.5" /> CPU
                      </Badge>
                    )}
                  </div>
                  <div className="col-span-4 font-medium truncate">
                    {pick.player?.name || "—"}
                  </div>
                  <div className="col-span-1">
                    <Badge variant="secondary" className="text-[9px] h-4 px-1 font-mono">
                      {pick.player?.position || "—"}
                    </Badge>
                  </div>
                  <div className="col-span-2 text-muted-foreground text-xs truncate">
                    {pick.player?.college || "—"}
                  </div>
                  <div className="col-span-1 text-right font-mono font-bold text-primary text-sm">
                    {pick.player?.grade || "—"}
                  </div>
                </div>
              );
            })}
            {roundPicks.length === 0 && (
              <div className="p-8 text-center text-muted-foreground text-sm italic">
                No picks in Round {compareRound}.
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)} data-testid="button-close-comparison">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

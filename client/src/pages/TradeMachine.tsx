import Layout from "@/components/Layout";
import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  ArrowRightLeft,
  Plus,
  X,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Users,
  Save,
  RotateCcw,
  Info,
  ArrowRight,
  Scale,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import type { Team, RosterPlayer, DraftOrderEntry } from "@shared/schema";
import { useSport } from "@/lib/sportContext";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface TradeTeamSlot {
  teamCode: string;
  playersOut: RosterPlayer[];
  picksOut: DraftOrderEntry[];
}

interface TradeValidationTeamResult {
  teamCode: string;
  salaryOut: number;
  salaryIn: number;
  netChange: number;
  rosterSizeAfter: number;
  taxStatus: string;
  maxAllowedIncoming: number;
  passed: boolean;
  reasons: string[];
}

interface TradeValidationResult {
  isValid: boolean;
  teamResults: TradeValidationTeamResult[];
  overallReasons: string[];
}

const TAX_STATUS_LABELS: Record<string, string> = {
  under_cap: "Under Cap",
  taxpayer: "Taxpayer",
  first_apron: "First Apron",
  second_apron: "Second Apron",
};

const TAX_STATUS_COLORS: Record<string, string> = {
  under_cap: "text-emerald-400 bg-emerald-500/20",
  taxpayer: "text-yellow-400 bg-yellow-500/20",
  first_apron: "text-orange-400 bg-orange-500/20",
  second_apron: "text-red-400 bg-red-500/20",
};

function formatMoney(amount: number) {
  return `$${Math.abs(amount).toFixed(1)}M`;
}

export default function TradeMachine() {
  const { sport } = useSport();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: teamsData } = useQuery<Team[]>({ queryKey: [`/api/teams?sport=${sport}`] });
  const { data: rosterData } = useQuery<RosterPlayer[]>({ queryKey: [`/api/roster?sport=${sport}`] });
  const { data: draftOrderData } = useQuery<DraftOrderEntry[]>({ queryKey: [`/api/draft-order?sport=${sport}`] });

  const [tradeSlots, setTradeSlots] = useState<TradeTeamSlot[]>([
    { teamCode: "", playersOut: [], picksOut: [] },
    { teamCode: "", playersOut: [], picksOut: [] },
  ]);
  const [validationResult, setValidationResult] = useState<TradeValidationResult | null>(null);
  const [showTeamPicker, setShowTeamPicker] = useState<number | null>(null);
  const [playerSearch, setPlayerSearch] = useState("");
  const [showAddPlayer, setShowAddPlayer] = useState<number | null>(null);
  const [showAddPick, setShowAddPick] = useState<number | null>(null);
  const [showCapSettings, setShowCapSettings] = useState(false);
  const [lastSavedTradeId, setLastSavedTradeId] = useState<number | null>(null);
  const [showExecuteConfirm, setShowExecuteConfirm] = useState(false);

  const teamsMap = useMemo(() => {
    const map: Record<string, Team> = {};
    teamsData?.forEach(t => { map[t.code] = t; });
    return map;
  }, [teamsData]);

  const rosterByTeam = useMemo(() => {
    const map: Record<string, RosterPlayer[]> = {};
    rosterData?.forEach(p => {
      if (!map[p.teamCode]) map[p.teamCode] = [];
      map[p.teamCode].push(p);
    });
    return map;
  }, [rosterData]);

  const picksByTeam = useMemo(() => {
    const map: Record<string, DraftOrderEntry[]> = {};
    draftOrderData?.forEach(p => {
      if (!map[p.teamCode]) map[p.teamCode] = [];
      map[p.teamCode].push(p);
    });
    return map;
  }, [draftOrderData]);

  const usedTeamCodes = useMemo(() => new Set(tradeSlots.map(s => s.teamCode).filter(Boolean)), [tradeSlots]);

  const setTeam = useCallback((slotIndex: number, teamCode: string) => {
    setTradeSlots(prev => {
      const next = [...prev];
      next[slotIndex] = { teamCode, playersOut: [], picksOut: [] };
      return next;
    });
    setShowTeamPicker(null);
    setValidationResult(null);
  }, []);

  const addPlayerToTrade = useCallback((slotIndex: number, player: RosterPlayer) => {
    setTradeSlots(prev => {
      const next = [...prev];
      const slot = { ...next[slotIndex] };
      if (slot.playersOut.find(p => p.id === player.id)) return prev;
      slot.playersOut = [...slot.playersOut, player];
      next[slotIndex] = slot;
      return next;
    });
    setShowAddPlayer(null);
    setPlayerSearch("");
    setValidationResult(null);
  }, []);

  const removePlayerFromTrade = useCallback((slotIndex: number, playerId: number) => {
    setTradeSlots(prev => {
      const next = [...prev];
      const slot = { ...next[slotIndex] };
      slot.playersOut = slot.playersOut.filter(p => p.id !== playerId);
      next[slotIndex] = slot;
      return next;
    });
    setValidationResult(null);
  }, []);

  const addPickToTrade = useCallback((slotIndex: number, pick: DraftOrderEntry) => {
    setTradeSlots(prev => {
      const next = [...prev];
      const slot = { ...next[slotIndex] };
      if (slot.picksOut.find(p => p.id === pick.id)) return prev;
      slot.picksOut = [...slot.picksOut, pick];
      next[slotIndex] = slot;
      return next;
    });
    setShowAddPick(null);
    setValidationResult(null);
  }, []);

  const removePickFromTrade = useCallback((slotIndex: number, pickId: number) => {
    setTradeSlots(prev => {
      const next = [...prev];
      const slot = { ...next[slotIndex] };
      slot.picksOut = slot.picksOut.filter(p => p.id !== pickId);
      next[slotIndex] = slot;
      return next;
    });
    setValidationResult(null);
  }, []);

  const addTradeTeam = useCallback(() => {
    if (tradeSlots.length >= 4) return;
    setTradeSlots(prev => [...prev, { teamCode: "", playersOut: [], picksOut: [] }]);
  }, [tradeSlots.length]);

  const removeTradeTeam = useCallback((index: number) => {
    if (tradeSlots.length <= 2) return;
    setTradeSlots(prev => prev.filter((_, i) => i !== index));
    setValidationResult(null);
  }, [tradeSlots.length]);

  const resetTrade = useCallback(() => {
    setTradeSlots([
      { teamCode: "", playersOut: [], picksOut: [] },
      { teamCode: "", playersOut: [], picksOut: [] },
    ]);
    setValidationResult(null);
  }, []);

  const getIncomingPlayers = useCallback((slotIndex: number) => {
    const thisTeam = tradeSlots[slotIndex].teamCode;
    const incoming: RosterPlayer[] = [];
    tradeSlots.forEach((slot, i) => {
      if (i === slotIndex) return;
      slot.playersOut.forEach(p => {
        if (tradeSlots.length === 2) {
          incoming.push(p);
        } else {
          incoming.push(p);
        }
      });
    });
    return incoming;
  }, [tradeSlots]);

  const getIncomingPicks = useCallback((slotIndex: number) => {
    const incoming: DraftOrderEntry[] = [];
    tradeSlots.forEach((slot, i) => {
      if (i === slotIndex) return;
      slot.picksOut.forEach(p => incoming.push(p));
    });
    return incoming;
  }, [tradeSlots]);

  const canValidate = useMemo(() => {
    const allTeamsSelected = tradeSlots.every(s => s.teamCode);
    const hasAssets = tradeSlots.some(s => s.playersOut.length > 0 || s.picksOut.length > 0);
    return allTeamsSelected && hasAssets;
  }, [tradeSlots]);

  const validateMutation = useMutation({
    mutationFn: async () => {
      const teamStates = tradeSlots.map((slot, i) => {
        const teamRoster = rosterByTeam[slot.teamCode] || [];
        const totalSalary = teamRoster.reduce((sum, p) => sum + (p.capHit || 0), 0);

        const incomingPlayers = getIncomingPlayers(i);
        const salaryOut = slot.playersOut.reduce((sum, p) => sum + (p.capHit || 0), 0);
        const salaryIn = incomingPlayers.reduce((sum, p) => sum + (p.capHit || 0), 0);

        return {
          teamCode: slot.teamCode,
          currentSalary: totalSalary,
          capSpace: (teamsMap[slot.teamCode]?.capSpace || 0),
          rosterSize: teamRoster.length,
          playersOut: slot.playersOut.map(p => ({ id: p.id, name: p.name, salary: p.capHit || 0 })),
          playersIn: incomingPlayers.map(p => ({ id: p.id, name: p.name, salary: p.capHit || 0 })),
          picksOut: slot.picksOut.map(p => ({ id: p.id, description: `R${p.round} Pick #${p.pickNumber}` })),
          picksIn: getIncomingPicks(i).map(p => ({ id: p.id, description: `R${p.round} Pick #${p.pickNumber}` })),
        };
      });

      const response = await apiRequest("POST", "/api/trades/validate", { teams: teamStates, year: 2026 });
      return response.json();
    },
    onSuccess: (data: TradeValidationResult) => {
      setValidationResult(data);
    },
    onError: (error: Error) => {
      toast({ title: "Validation Error", description: error.message, variant: "destructive" });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const legs = tradeSlots.flatMap((slot, i) => {
        const otherSlots = tradeSlots.filter((_, j) => j !== i);
        if (otherSlots.length === 1) {
          return [{
            fromTeamCode: slot.teamCode,
            toTeamCode: otherSlots[0].teamCode,
            playerIds: slot.playersOut.map(p => p.id),
            pickIds: slot.picksOut.map(p => p.id),
          }];
        }
        return otherSlots.map(other => ({
          fromTeamCode: slot.teamCode,
          toTeamCode: other.teamCode,
          playerIds: slot.playersOut.map(p => p.id),
          pickIds: slot.picksOut.map(p => p.id),
        }));
      });

      const response = await apiRequest("POST", "/api/trades", {
        name: `Trade: ${tradeSlots.map(s => s.teamCode).join(" ↔ ")}`,
        sport,
        status: "draft",
        legs,
        validationResult,
      });
      return response.json();
    },
    onSuccess: (data: any) => {
      setLastSavedTradeId(data.id);
      toast({ title: "Trade Saved", description: "Trade proposal saved successfully" });
    },
  });

  const executeMutation = useMutation({
    mutationFn: async (tradeId: number) => {
      const response = await apiRequest("POST", `/api/trades/${tradeId}/apply`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/roster?sport=${sport}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/teams?sport=${sport}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/draft-order?sport=${sport}`] });
      toast({ title: "Trade Executed!", description: "Player rosters have been updated. Changes are now reflected in Team Builder." });
      setShowExecuteConfirm(false);
      resetTrade();
      setLastSavedTradeId(null);
    },
    onError: (error: Error) => {
      toast({ title: "Execution Error", description: error.message, variant: "destructive" });
    },
  });

  const availableTeams = useMemo(() => {
    if (!teamsData) return [];
    return teamsData
      .filter(t => !usedTeamCodes.has(t.code) || tradeSlots[showTeamPicker!]?.teamCode === t.code)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [teamsData, usedTeamCodes, showTeamPicker]);

  if (sport !== "NBA") {
    return (
      <Layout>
        <div className="h-[calc(100vh-8rem)] flex items-center justify-center">
          <div className="text-center space-y-4">
            <Scale className="h-16 w-16 text-muted-foreground mx-auto" />
            <h2 className="text-2xl font-display font-bold">Trade Machine</h2>
            <p className="text-muted-foreground">The Trade Machine is currently available for NBA only. Switch to NBA mode to use it.</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-4 p-4 md:p-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <ArrowRightLeft className="h-7 w-7 text-primary" />
            <div>
              <h1 className="text-2xl md:text-3xl font-display font-bold tracking-wider" data-testid="text-trade-machine-title">
                TRADE MACHINE
              </h1>
              <p className="text-sm text-muted-foreground">Propose and validate NBA trades with CBA salary matching rules</p>
            </div>
          </div>
          <div className="flex gap-2">
            {tradeSlots.length < 4 && (
              <Button variant="outline" size="sm" onClick={addTradeTeam} data-testid="button-add-team">
                <Plus className="h-4 w-4 mr-1" /> Add Team
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setShowCapSettings(true)} data-testid="button-cap-settings">
              <DollarSign className="h-4 w-4 mr-1" /> Cap Rules
            </Button>
            <Button variant="outline" size="sm" onClick={resetTrade} data-testid="button-reset-trade">
              <RotateCcw className="h-4 w-4 mr-1" /> Reset
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tradeSlots.map((slot, index) => {
            const team = slot.teamCode ? teamsMap[slot.teamCode] : null;
            const teamRoster = slot.teamCode ? (rosterByTeam[slot.teamCode] || []) : [];
            const teamPicks = slot.teamCode ? (picksByTeam[slot.teamCode] || []) : [];
            const totalSalary = teamRoster.reduce((sum, p) => sum + (p.capHit || 0), 0);
            const salaryOut = slot.playersOut.reduce((sum, p) => sum + (p.capHit || 0), 0);
            const incomingPlayers = getIncomingPlayers(index);
            const salaryIn = incomingPlayers.reduce((sum, p) => sum + (p.capHit || 0), 0);
            const incomingPicks = getIncomingPicks(index);
            const teamResult = validationResult?.teamResults.find(r => r.teamCode === slot.teamCode);

            return (
              <Card key={index} className={cn(
                "border",
                teamResult ? (teamResult.passed ? "border-emerald-500/50" : "border-red-500/50") : "border-border"
              )}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    {team ? (
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: team.primaryColor }} />
                        <CardTitle className="text-base font-display">{team.name}</CardTitle>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowTeamPicker(index)}
                        className="w-full"
                        data-testid={`button-select-team-${index}`}
                      >
                        <Users className="h-4 w-4 mr-1" /> Select Team
                      </Button>
                    )}
                    <div className="flex items-center gap-1">
                      {team && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowTeamPicker(index)}>
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      )}
                      {tradeSlots.length > 2 && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => removeTradeTeam(index)}>
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  {team && (
                    <div className="flex gap-2 text-xs text-muted-foreground mt-1">
                      <span>Cap: {formatMoney(team.capSpace || 0)}</span>
                      <span>Salary: {formatMoney(totalSalary)}</span>
                      <span>Roster: {teamRoster.length}</span>
                    </div>
                  )}
                </CardHeader>

                {team && (
                  <CardContent className="space-y-3 pt-0">
                    {teamResult && (
                      <div className={cn(
                        "rounded-lg p-2 text-xs",
                        teamResult.passed ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                      )}>
                        <div className="flex items-center gap-1 font-semibold mb-1">
                          {teamResult.passed ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                          {teamResult.passed ? "Trade OK" : "Trade Fails"}
                        </div>
                        <Badge className={cn("text-[10px]", TAX_STATUS_COLORS[teamResult.taxStatus])}>
                          {TAX_STATUS_LABELS[teamResult.taxStatus] || teamResult.taxStatus}
                        </Badge>
                        <div className="mt-1 space-y-0.5">
                          <div>Salary Out: {formatMoney(teamResult.salaryOut)} → In: {formatMoney(teamResult.salaryIn)}</div>
                          <div>Max Allowed: {formatMoney(teamResult.maxAllowedIncoming)}</div>
                          {teamResult.reasons.map((r, ri) => (
                            <div key={ri} className="flex items-start gap-1">
                              <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                              <span>{r}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-red-400 uppercase tracking-wider">Sends Out</span>
                        {salaryOut > 0 && <span className="text-xs text-red-400">{formatMoney(salaryOut)}</span>}
                      </div>
                      <div className="space-y-1">
                        {slot.playersOut.map(p => (
                          <div key={p.id} className="flex items-center justify-between bg-red-500/10 rounded px-2 py-1 text-xs group">
                            <div className="flex items-center gap-1.5">
                              <Badge variant="outline" className="text-[10px] px-1">{p.position}</Badge>
                              <span className="font-medium">{p.name}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-muted-foreground">{formatMoney(p.capHit || 0)}</span>
                              <button
                                onClick={() => removePlayerFromTrade(index, p.id)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400"
                                data-testid={`button-remove-player-${p.id}`}
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                        {slot.picksOut.map(p => (
                          <div key={`pick-${p.id}`} className="flex items-center justify-between bg-red-500/10 rounded px-2 py-1 text-xs group">
                            <div className="flex items-center gap-1.5">
                              <Badge variant="outline" className="text-[10px] px-1">PICK</Badge>
                              <span className="font-medium">R{p.round} #{p.pickNumber}</span>
                            </div>
                            <button
                              onClick={() => removePickFromTrade(index, p.id)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                        <div className="flex gap-1 mt-1">
                          <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={() => setShowAddPlayer(index)}>
                            <Plus className="h-3 w-3 mr-1" /> Player
                          </Button>
                          <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={() => setShowAddPick(index)}>
                            <Plus className="h-3 w-3 mr-1" /> Pick
                          </Button>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Receives</span>
                        {salaryIn > 0 && <span className="text-xs text-emerald-400">{formatMoney(salaryIn)}</span>}
                      </div>
                      <div className="space-y-1">
                        {incomingPlayers.map(p => (
                          <div key={p.id} className="flex items-center justify-between bg-emerald-500/10 rounded px-2 py-1 text-xs">
                            <div className="flex items-center gap-1.5">
                              <Badge variant="outline" className="text-[10px] px-1">{p.position}</Badge>
                              <span className="font-medium">{p.name}</span>
                            </div>
                            <span className="text-muted-foreground">{formatMoney(p.capHit || 0)}</span>
                          </div>
                        ))}
                        {incomingPicks.map(p => (
                          <div key={`pick-in-${p.id}`} className="flex items-center justify-between bg-emerald-500/10 rounded px-2 py-1 text-xs">
                            <div className="flex items-center gap-1.5">
                              <Badge variant="outline" className="text-[10px] px-1">PICK</Badge>
                              <span className="font-medium">R{p.round} #{p.pickNumber}</span>
                            </div>
                          </div>
                        ))}
                        {incomingPlayers.length === 0 && incomingPicks.length === 0 && (
                          <p className="text-xs text-muted-foreground italic">No assets incoming yet</p>
                        )}
                      </div>
                    </div>

                    {(salaryOut > 0 || salaryIn > 0) && (
                      <>
                        <Separator />
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Net Salary</span>
                          <span className={cn(
                            "font-semibold",
                            (salaryIn - salaryOut) > 0 ? "text-red-400" : "text-emerald-400"
                          )}>
                            {(salaryIn - salaryOut) > 0 ? "+" : ""}{formatMoney(salaryIn - salaryOut)}
                          </span>
                        </div>
                      </>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <Button
            size="lg"
            onClick={() => validateMutation.mutate()}
            disabled={!canValidate || validateMutation.isPending}
            className="px-8"
            data-testid="button-validate-trade"
          >
            <Scale className="h-5 w-5 mr-2" />
            {validateMutation.isPending ? "Checking..." : "Check Trade"}
          </Button>
          {validationResult && (
            <Button
              variant="outline"
              size="lg"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              data-testid="button-save-trade"
            >
              <Save className="h-5 w-5 mr-2" />
              Save Trade
            </Button>
          )}
          {validationResult?.isValid && lastSavedTradeId && (
            <Button
              size="lg"
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-8"
              onClick={() => setShowExecuteConfirm(true)}
              disabled={executeMutation.isPending}
              data-testid="button-execute-trade"
            >
              <Zap className="h-5 w-5 mr-2" />
              {executeMutation.isPending ? "Executing..." : "Execute Trade"}
            </Button>
          )}
        </div>

        {validationResult && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className={cn(
              "border-2",
              validationResult.isValid ? "border-emerald-500/50 bg-emerald-500/5" : "border-red-500/50 bg-red-500/5"
            )}>
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  {validationResult.isValid ? (
                    <CheckCircle2 className="h-8 w-8 text-emerald-400 shrink-0" />
                  ) : (
                    <XCircle className="h-8 w-8 text-red-400 shrink-0" />
                  )}
                  <div>
                    <h3 className="text-lg font-display font-bold">
                      {validationResult.isValid ? "Trade is Legal" : "Trade Not Allowed"}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {validationResult.isValid
                        ? "This trade satisfies all NBA CBA salary matching requirements."
                        : "One or more teams fail salary matching or roster requirements."}
                    </p>
                    {validationResult.overallReasons.map((r, i) => (
                      <p key={i} className="text-sm text-red-400 mt-1">{r}</p>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <Dialog open={showTeamPicker !== null} onOpenChange={() => setShowTeamPicker(null)}>
          <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Select Team</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-2">
              {availableTeams.map(team => (
                <Button
                  key={team.code}
                  variant="outline"
                  className="justify-start h-auto py-2 px-3"
                  onClick={() => showTeamPicker !== null && setTeam(showTeamPicker, team.code)}
                  data-testid={`button-team-${team.code}`}
                >
                  <div className="w-3 h-3 rounded-full mr-2 shrink-0" style={{ backgroundColor: team.primaryColor }} />
                  <div className="text-left text-xs">
                    <div className="font-semibold">{team.code}</div>
                    <div className="text-muted-foreground truncate">{team.name}</div>
                  </div>
                </Button>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showAddPlayer !== null} onOpenChange={() => { setShowAddPlayer(null); setPlayerSearch(""); }}>
          <DialogContent className="max-w-md max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>Add Player to Trade</DialogTitle>
            </DialogHeader>
            <Input
              placeholder="Search players..."
              value={playerSearch}
              onChange={e => setPlayerSearch(e.target.value)}
              className="mb-2"
              data-testid="input-player-search"
            />
            <ScrollArea className="h-[400px]">
              <div className="space-y-1">
                {showAddPlayer !== null && (() => {
                  const slot = tradeSlots[showAddPlayer];
                  if (!slot?.teamCode) return null;
                  const roster = rosterByTeam[slot.teamCode] || [];
                  const alreadyAdded = new Set(slot.playersOut.map(p => p.id));
                  const filtered = roster
                    .filter(p => !alreadyAdded.has(p.id))
                    .filter(p => !playerSearch || p.name.toLowerCase().includes(playerSearch.toLowerCase()) || p.position.toLowerCase().includes(playerSearch.toLowerCase()))
                    .sort((a, b) => (b.capHit || 0) - (a.capHit || 0));
                  
                  return filtered.map(p => (
                    <Button
                      key={p.id}
                      variant="ghost"
                      className="w-full justify-between h-auto py-2"
                      onClick={() => addPlayerToTrade(showAddPlayer, p)}
                      data-testid={`button-add-player-${p.id}`}
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">{p.position}</Badge>
                        <span className="text-sm">{p.name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{formatMoney(p.capHit || 0)} / {p.contractYears || "?"}yr</span>
                    </Button>
                  ));
                })()}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>

        <Dialog open={showAddPick !== null} onOpenChange={() => setShowAddPick(null)}>
          <DialogContent className="max-w-sm max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>Add Draft Pick</DialogTitle>
            </DialogHeader>
            <ScrollArea className="h-[300px]">
              <div className="space-y-1">
                {showAddPick !== null && (() => {
                  const slot = tradeSlots[showAddPick];
                  if (!slot?.teamCode) return null;
                  const picks = picksByTeam[slot.teamCode] || [];
                  const alreadyAdded = new Set(slot.picksOut.map(p => p.id));
                  return picks
                    .filter(p => !alreadyAdded.has(p.id))
                    .sort((a, b) => a.round - b.round || a.pickNumber - b.pickNumber)
                    .map(p => (
                      <Button
                        key={p.id}
                        variant="ghost"
                        className="w-full justify-start h-auto py-2"
                        onClick={() => addPickToTrade(showAddPick, p)}
                      >
                        <Badge variant="outline" className="text-[10px] mr-2">R{p.round}</Badge>
                        <span className="text-sm">Pick #{p.pickNumber} ({p.year})</span>
                      </Button>
                    ));
                })()}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>

        <CapSettingsDialog open={showCapSettings} onClose={() => setShowCapSettings(false)} />

        <Dialog open={showExecuteConfirm} onOpenChange={setShowExecuteConfirm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-emerald-400" />
                Execute Trade
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              <p>This will permanently move players between teams in the database. The changes will be reflected in the Team Builder, rosters, and cap sheets.</p>
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                {tradeSlots.filter(s => s.teamCode).map((slot, i) => (
                  <div key={i}>
                    <span className="font-semibold">{teamsMap[slot.teamCode]?.name || slot.teamCode}</span>
                    {slot.playersOut.length > 0 && (
                      <span className="text-muted-foreground"> sends {slot.playersOut.map(p => p.name).join(", ")}</span>
                    )}
                    {slot.picksOut.length > 0 && (
                      <span className="text-muted-foreground">
                        {slot.playersOut.length > 0 ? " + " : " sends "}
                        {slot.picksOut.map(p => `R${p.round} #${p.pickNumber}`).join(", ")}
                      </span>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
                <p className="text-xs text-amber-400">This action cannot be undone. Rosters will be permanently updated.</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowExecuteConfirm(false)}>Cancel</Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={() => lastSavedTradeId && executeMutation.mutate(lastSavedTradeId)}
                disabled={executeMutation.isPending}
                data-testid="button-confirm-execute"
              >
                {executeMutation.isPending ? "Executing..." : "Confirm & Execute"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}

function CapSettingsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: settings } = useQuery<any[]>({ queryKey: ["/api/cap-settings?sport=NBA"] });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            NBA Salary Cap Rules
          </DialogTitle>
        </DialogHeader>
        <div className="text-sm space-y-3">
          <div className="bg-muted rounded-lg p-3 space-y-2">
            <h4 className="font-semibold">Trade Matching Rules (2024 CBA)</h4>
            <ul className="list-disc list-inside space-y-1 text-xs text-muted-foreground">
              <li><strong className="text-foreground">Under Cap:</strong> Can absorb salary up to available cap room</li>
              <li><strong className="text-foreground">Taxpayer (≤$7.5M out):</strong> Receive up to 200% + $250K</li>
              <li><strong className="text-foreground">Taxpayer ($7.5M–$29M out):</strong> Receive up to 175% + $250K</li>
              <li><strong className="text-foreground">Taxpayer (≥$29M out):</strong> Receive up to 125% + $250K</li>
              <li><strong className="text-foreground">First Apron:</strong> Receive up to 110% + $100K</li>
              <li><strong className="text-foreground">Second Apron:</strong> Incoming ≤ outgoing (no aggregation)</li>
            </ul>
          </div>

          {settings && (
            <div>
              <h4 className="font-semibold mb-2">Cap Thresholds by Year ($M)</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-1 px-2">Year</th>
                      <th className="text-right py-1 px-2">Cap</th>
                      <th className="text-right py-1 px-2">Tax</th>
                      <th className="text-right py-1 px-2">1st Apron</th>
                      <th className="text-right py-1 px-2">2nd Apron</th>
                    </tr>
                  </thead>
                  <tbody>
                    {settings.map((s: any) => (
                      <tr key={s.year} className="border-b border-border/50">
                        <td className="py-1 px-2 font-semibold">{s.year}-{(s.year + 1).toString().slice(-2)}</td>
                        <td className="text-right py-1 px-2">${s.salaryCap}M</td>
                        <td className="text-right py-1 px-2">${s.taxLine}M</td>
                        <td className="text-right py-1 px-2">${s.firstApron}M</td>
                        <td className="text-right py-1 px-2">${s.secondApron}M</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="bg-muted rounded-lg p-3 space-y-1">
            <h4 className="font-semibold">Roster Limits</h4>
            <p className="text-xs text-muted-foreground">Min: 12 players · Max: 15 standard roster spots</p>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

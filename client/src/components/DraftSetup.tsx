import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Monitor, User, Minus, Plus, ListOrdered, ArrowLeftRight, Settings2, Repeat2, X, Dice5, Trophy, ArrowUp, ArrowDown, ChevronRight, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Team } from "@shared/schema";
import { useSport } from "@/lib/sportContext";

const NBA_LOTTERY_COMBINATIONS = [140, 140, 140, 125, 105, 90, 75, 60, 45, 30, 20, 15, 10, 5];

interface LotteryResult {
  originalSlot: number;
  teamCode: string;
  newSlot: number;
  combinations: number;
  odds: string;
  movement: number;
}

function simulateNBALottery(lotteryTeams: string[]): LotteryResult[] {
  const teamPool = lotteryTeams.slice(0, 14);
  const results: LotteryResult[] = teamPool.map((teamCode, i) => ({
    originalSlot: i + 1,
    teamCode,
    newSlot: 0,
    combinations: NBA_LOTTERY_COMBINATIONS[i],
    odds: ((NBA_LOTTERY_COMBINATIONS[i] / 1000) * 100).toFixed(1) + '%',
    movement: 0,
  }));

  const remaining = [...results];
  const winners: LotteryResult[] = [];

  for (let pick = 1; pick <= 4; pick++) {
    const totalCombos = remaining.reduce((sum, r) => sum + r.combinations, 0);
    let rand = Math.random() * totalCombos;
    let winner: LotteryResult | null = null;

    for (const team of remaining) {
      rand -= team.combinations;
      if (rand <= 0) {
        winner = team;
        break;
      }
    }

    if (!winner) winner = remaining[remaining.length - 1];

    winner.newSlot = pick;
    winners.push(winner);
    const idx = remaining.indexOf(winner);
    if (idx !== -1) remaining.splice(idx, 1);
  }

  remaining.sort((a, b) => a.originalSlot - b.originalSlot);

  const worstTeam = results[0];
  const worstWon = winners.includes(worstTeam);

  if (!worstWon) {
    const worstIdx = remaining.indexOf(worstTeam);
    if (worstIdx !== -1 && (4 + worstIdx + 1) > 5) {
      remaining.splice(worstIdx, 1);
      remaining.splice(0, 0, worstTeam);
    }
  }

  remaining.forEach((r, i) => {
    r.newSlot = 5 + i;
  });

  const allResults = [...results].sort((a, b) => a.newSlot - b.newSlot);
  allResults.forEach(r => {
    r.movement = r.originalSlot - r.newSlot;
  });

  return allResults;
}

export interface TeamController {
  type: 'CPU' | 'USER';
  name: string;
}

export type TeamControllers = Record<string, TeamController>;

export interface DraftSlotInfo {
  round: number;
  pickInRound: number;
  overall: number;
  teamCode: string;
  originalTeamCode?: string | null;
}

export interface PickTrade {
  pickOverall: number;
  fromTeam: string;
  toTeam: string;
}

export interface DraftSettings {
  rounds: number;
  includeCompPicks: boolean;
  trades: PickTrade[];
}

interface DraftSetupProps {
  isOpen: boolean;
  onStart: (controllers: TeamControllers, settings: DraftSettings) => void;
  onClose?: () => void;
  teams: Record<string, Team>;
  draftOrderTeams: string[];
  draftSlots: DraftSlotInfo[];
}

export default function DraftSetup({ isOpen, onStart, onClose, teams, draftOrderTeams, draftSlots }: DraftSetupProps) {
  const uniqueTeams = Array.from(new Set(draftOrderTeams));
  const { sport, maxRounds, teamsPerRound } = useSport();
  
  const [controllers, setControllers] = useState<TeamControllers>({});
  const [selectedRounds, setSelectedRounds] = useState(1);
  const [activeTab, setActiveTab] = useState<'teams' | 'order' | 'settings' | 'lottery'>('teams');
  const [includeCompPicks, setIncludeCompPicks] = useState(true);
  const [trades, setTrades] = useState<PickTrade[]>([]);
  const [tradeTeamA, setTradeTeamA] = useState<string>("");
  const [tradeTeamB, setTradeTeamB] = useState<string>("");
  const [tradePickA, setTradePickA] = useState<string>("");
  const [tradePickB, setTradePickB] = useState<string>("");

  const [lotteryResults, setLotteryResults] = useState<LotteryResult[] | null>(null);
  const [lotteryRevealed, setLotteryRevealed] = useState<number>(0);
  const [lotterySimulating, setLotterySimulating] = useState(false);
  const [lotteryApplied, setLotteryApplied] = useState(false);
  const revealTimerRef = useRef<NodeJS.Timeout | null>(null);

  const lotteryTeams = useMemo(() => {
    return draftSlots
      .filter(s => s.round === 1)
      .sort((a, b) => a.overall - b.overall)
      .map(s => s.originalTeamCode || s.teamCode)
      .slice(0, 14);
  }, [draftSlots]);

  const runLottery = useCallback(() => {
    if (sport !== 'NBA') return;
    setLotterySimulating(true);
    setLotteryRevealed(0);
    setLotteryApplied(false);

    setTimeout(() => {
      const results = simulateNBALottery(lotteryTeams);
      setLotteryResults(results);
      setLotterySimulating(false);

      let count = 0;
      const revealNext = () => {
        count++;
        setLotteryRevealed(count);
        if (count < 14) {
          revealTimerRef.current = setTimeout(revealNext, count <= 4 ? 800 : 300);
        }
      };
      revealTimerRef.current = setTimeout(revealNext, 600);
    }, 1500);
  }, [sport, lotteryTeams]);

  const applyLotteryResults = useCallback(() => {
    if (!lotteryResults) return;
    const newTrades: PickTrade[] = [];

    const round1Slots = draftSlots
      .filter(s => s.round === 1)
      .sort((a, b) => a.overall - b.overall);

    const originalToOwner: Record<string, string> = {};
    round1Slots.slice(0, 14).forEach(s => {
      const orig = s.originalTeamCode || s.teamCode;
      originalToOwner[orig] = s.teamCode;
    });

    lotteryResults.forEach(result => {
      const targetSlot = round1Slots[result.newSlot - 1];
      const owningTeam = originalToOwner[result.teamCode] || result.teamCode;
      if (targetSlot && targetSlot.teamCode !== owningTeam) {
        newTrades.push({
          pickOverall: targetSlot.overall,
          fromTeam: targetSlot.teamCode,
          toTeam: owningTeam,
        });
      }
    });

    setTrades(prev => {
      const nonLotteryTrades = prev.filter(t => {
        const slot = round1Slots.find(s => s.overall === t.pickOverall);
        return !slot || round1Slots.indexOf(slot) >= 14;
      });
      return [...nonLotteryTrades, ...newTrades];
    });

    setLotteryApplied(true);
  }, [lotteryResults, draftSlots]);

  const resetLottery = useCallback(() => {
    if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
    setLotteryResults(null);
    setLotteryRevealed(0);
    setLotterySimulating(false);
    setLotteryApplied(false);
  }, []);

  useEffect(() => {
    if (uniqueTeams.length > 0 && Object.keys(controllers).length === 0) {
      const initial: TeamControllers = {};
      uniqueTeams.forEach(team => {
        initial[team] = { type: 'CPU', name: 'CPU' };
      });
      setControllers(initial);
    }
  }, [uniqueTeams.length]);

  const toggleTeam = (teamCode: string) => {
    setControllers(prev => {
      const current = prev[teamCode];
      const newType = current.type === 'CPU' ? 'USER' : 'CPU';
      return {
        ...prev,
        [teamCode]: {
          type: newType,
          name: newType === 'USER' ? 'Player 1' : 'CPU'
        }
      };
    });
  };

  const updateUserName = (teamCode: string, name: string) => {
    setControllers(prev => ({
      ...prev,
      [teamCode]: { ...prev[teamCode], name }
    }));
  };

  const setAll = (type: 'CPU' | 'USER') => {
    setControllers(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(key => {
        next[key] = { type, name: type === 'USER' ? 'Player 1' : 'CPU' };
      });
      return next;
    });
  };

  const isCompPick = (slot: DraftSlotInfo) => {
    const roundSlots = draftSlots.filter(s => s.round === slot.round);
    const sortedByOverall = [...roundSlots].sort((a, b) => a.overall - b.overall);
    const idx = sortedByOverall.findIndex(s => s.overall === slot.overall);
    return idx >= teamsPerRound;
  };

  const adjustedSlots = useMemo(() => {
    let slots = draftSlots.filter(s => s.round <= selectedRounds);

    if (!includeCompPicks) {
      const roundCounts: Record<number, number> = {};
      slots = slots.filter(s => {
        if (!roundCounts[s.round]) roundCounts[s.round] = 0;
        roundCounts[s.round]++;
        return roundCounts[s.round] <= teamsPerRound;
      });
    }

    if (trades.length > 0) {
      slots = slots.map(s => {
        const trade = trades.find(t => t.pickOverall === s.overall);
        if (trade) {
          return { ...s, teamCode: trade.toTeam };
        }
        return s;
      });
    }

    return slots;
  }, [draftSlots, selectedRounds, includeCompPicks, trades, teamsPerRound]);

  const compPickCount = useMemo(() => {
    const roundSlots = draftSlots.filter(s => s.round <= selectedRounds);
    let count = 0;
    const roundCounts: Record<number, number> = {};
    roundSlots.forEach(s => {
      if (!roundCounts[s.round]) roundCounts[s.round] = 0;
      roundCounts[s.round]++;
      if (roundCounts[s.round] > teamsPerRound) count++;
    });
    return count;
  }, [draftSlots, selectedRounds, teamsPerRound]);

  const orderRoundTabs = useMemo(() => {
    const tabs: number[] = [];
    for (let i = 1; i <= selectedRounds; i++) tabs.push(i);
    return tabs;
  }, [selectedRounds]);

  const [orderRoundFilter, setOrderRoundFilter] = useState<number | 'all'>('all');

  const filteredSlots = useMemo(() => {
    if (orderRoundFilter === 'all') return adjustedSlots;
    return adjustedSlots.filter(s => s.round === orderRoundFilter);
  }, [adjustedSlots, orderRoundFilter]);

  const teamAPickOptions = useMemo(() => {
    if (!tradeTeamA) return [];
    return adjustedSlots.filter(s => s.teamCode === tradeTeamA);
  }, [tradeTeamA, adjustedSlots]);

  const teamBPickOptions = useMemo(() => {
    if (!tradeTeamB) return [];
    return adjustedSlots.filter(s => s.teamCode === tradeTeamB);
  }, [tradeTeamB, adjustedSlots]);

  const executeTrade = () => {
    if (!tradePickA || !tradePickB || !tradeTeamA || !tradeTeamB) return;
    const pickAOverall = parseInt(tradePickA);
    const pickBOverall = parseInt(tradePickB);
    
    setTrades(prev => [
      ...prev.filter(t => t.pickOverall !== pickAOverall && t.pickOverall !== pickBOverall),
      { pickOverall: pickAOverall, fromTeam: tradeTeamA, toTeam: tradeTeamB },
      { pickOverall: pickBOverall, fromTeam: tradeTeamB, toTeam: tradeTeamA },
    ]);

    setTradePickA("");
    setTradePickB("");
  };

  const executeReassign = () => {
    if (!tradePickA || !tradeTeamA || !tradeTeamB) return;
    const pickOverall = parseInt(tradePickA);
    
    setTrades(prev => [
      ...prev.filter(t => t.pickOverall !== pickOverall),
      { pickOverall, fromTeam: tradeTeamA, toTeam: tradeTeamB },
    ]);

    setTradePickA("");
  };

  const removeTrade = (pickOverall: number) => {
    setTrades(prev => prev.filter(t => t.pickOverall !== pickOverall));
  };

  const sortedTeams = useMemo(() => {
    return uniqueTeams
      .map(code => ({ code, name: teams[code]?.name || code }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [uniqueTeams, teams]);

  if (Object.keys(teams).length === 0 || draftOrderTeams.length === 0) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => { if (!open && onClose) onClose(); }}>
        <DialogContent className="max-w-md">
          <div className="flex items-center justify-center py-12">
            <div className="text-center space-y-4">
              <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-muted-foreground">Loading draft data...</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open && onClose) onClose(); }}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-2xl font-display">Draft Setup</DialogTitle>
          <DialogDescription>
            Choose how many rounds to simulate, configure settings, trade picks, and assign users to teams.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1">

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex items-center gap-3 bg-muted/30 border border-border rounded-lg px-4 py-3">
            <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Rounds:</span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={() => setSelectedRounds(r => Math.max(1, r - 1))}
                disabled={selectedRounds <= 1}
                data-testid="button-rounds-minus"
              >
                <Minus className="h-3 w-3" />
              </Button>
              <span className="text-lg font-mono font-bold w-6 text-center" data-testid="text-round-count">{selectedRounds}</span>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={() => setSelectedRounds(r => Math.min(maxRounds, r + 1))}
                disabled={selectedRounds >= maxRounds}
                data-testid="button-rounds-plus"
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
            <Badge variant="secondary" className="text-[10px]" data-testid="text-total-picks">
              {adjustedSlots.length} picks
            </Badge>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setAll('CPU')}>
              <Monitor className="h-4 w-4 mr-2" /> Set All CPU
            </Button>
            <Button variant="outline" size="sm" onClick={() => setAll('USER')}>
              <User className="h-4 w-4 mr-2" /> Set All User
            </Button>
          </div>
        </div>

        <div className="flex gap-1 flex-wrap">
          <Button
            variant={activeTab === 'teams' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('teams')}
            className="gap-1.5"
            data-testid="button-tab-teams"
          >
            <Users className="h-3.5 w-3.5" /> Team Control
          </Button>
          <Button
            variant={activeTab === 'order' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('order')}
            className="gap-1.5"
            data-testid="button-tab-order"
          >
            <ListOrdered className="h-3.5 w-3.5" /> Draft Order
            <Badge variant="secondary" className="text-[9px] h-4 ml-1">{adjustedSlots.length}</Badge>
          </Button>
          <Button
            variant={activeTab === 'settings' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('settings')}
            className="gap-1.5"
            data-testid="button-tab-settings"
          >
            <Settings2 className="h-3.5 w-3.5" /> Settings
            {(trades.length > 0 || !includeCompPicks) && (
              <Badge className="text-[9px] h-4 ml-1 bg-primary/20 text-primary border-primary/30">
                {trades.length > 0 && !includeCompPicks ? `${trades.length} trades, no comp` : trades.length > 0 ? `${trades.length} trades` : 'no comp'}
              </Badge>
            )}
          </Button>
          {sport === 'NBA' && (
            <Button
              variant={activeTab === 'lottery' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('lottery')}
              className="gap-1.5"
              data-testid="button-tab-lottery"
            >
              <Dice5 className="h-3.5 w-3.5" /> Lottery
              {lotteryApplied && (
                <Badge className="text-[9px] h-4 ml-1 bg-green-500/20 text-green-400 border-green-500/30">Applied</Badge>
              )}
            </Button>
          )}
        </div>

        {activeTab === 'teams' ? (
          <div className="overflow-y-auto max-h-[45vh] pr-2 border rounded-md p-2 bg-muted/20">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {uniqueTeams.map((teamCode) => {
                const team = teams[teamCode];
                const controller = controllers[teamCode];
                const isUser = controller?.type === 'USER';

                if (!team) return null;

                return (
                  <div 
                    key={teamCode} 
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border transition-all duration-200",
                      isUser 
                        ? "bg-primary/10 border-primary" 
                        : "bg-card border-border hover:border-primary/50"
                    )}
                    data-testid={`card-team-${teamCode}`}
                  >
                    <div 
                      className="h-10 w-10 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-sm"
                      style={{ backgroundColor: team.primaryColor }}
                    >
                      {teamCode}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-sm truncate">{team.name}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => toggleTeam(teamCode)}
                          data-testid={`button-toggle-${teamCode}`}
                        >
                          {isUser ? <Users className="h-3 w-3 text-primary" /> : <Monitor className="h-3 w-3 text-muted-foreground" />}
                        </Button>
                      </div>
                      
                      {isUser ? (
                        <Input 
                          value={controller.name} 
                          onChange={(e) => updateUserName(teamCode, e.target.value)}
                          className="h-7 text-xs"
                          placeholder="User Name"
                          data-testid={`input-name-${teamCode}`}
                        />
                      ) : (
                        <div className="h-7 flex items-center">
                          <Badge variant="secondary" className="text-[10px] h-5">CPU Auto-Pick</Badge>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : activeTab === 'order' ? (
          <div className="flex flex-col max-h-[45vh] border rounded-md bg-muted/20 overflow-hidden">
            {selectedRounds > 1 && (
              <div className="flex gap-1 p-2 border-b border-border bg-muted/30 flex-wrap">
                <Button
                  variant={orderRoundFilter === 'all' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-6 text-[10px] px-2"
                  onClick={() => setOrderRoundFilter('all')}
                  data-testid="button-order-filter-all"
                >
                  All
                </Button>
                {orderRoundTabs.map(r => (
                  <Button
                    key={r}
                    variant={orderRoundFilter === r ? 'default' : 'ghost'}
                    size="sm"
                    className="h-6 text-[10px] px-2"
                    onClick={() => setOrderRoundFilter(r)}
                    data-testid={`button-order-filter-${r}`}
                  >
                    R{r}
                  </Button>
                ))}
              </div>
            )}

            <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-muted/40 text-[10px] font-medium text-muted-foreground uppercase tracking-wider border-b border-border">
              <div className="col-span-1">#</div>
              <div className="col-span-1">Rnd</div>
              <div className="col-span-1">Pick</div>
              <div className="col-span-4">Team</div>
              <div className="col-span-3">Needs</div>
              <div className="col-span-2 text-right">Controller</div>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="divide-y divide-border/30">
                {filteredSlots.map((slot, idx) => {
                  const team = teams[slot.teamCode];
                  const controller = controllers[slot.teamCode];
                  const isUser = controller?.type === 'USER';
                  const isComp = isCompPick(slot);
                  const isTraded = trades.some(t => t.pickOverall === slot.overall);

                  return (
                    <div
                      key={`${slot.overall}`}
                      className={cn(
                        "grid grid-cols-12 gap-2 px-4 py-2 items-center text-sm transition-colors",
                        isUser ? "bg-primary/5" : "hover:bg-muted/30",
                        isTraded && "bg-yellow-500/5 border-l-2 border-l-yellow-500/50",
                      )}
                      data-testid={`order-pick-${slot.overall}`}
                    >
                      <div className="col-span-1 font-mono font-bold text-muted-foreground text-xs">
                        {slot.overall}
                      </div>
                      <div className="col-span-1 flex items-center gap-0.5">
                        <Badge variant="secondary" className="text-[9px] h-4 px-1 font-mono">
                          R{slot.round}
                        </Badge>
                        {isComp && (
                          <Badge className="text-[7px] h-3 px-0.5 bg-amber-500/20 text-amber-400 border-amber-500/30">C</Badge>
                        )}
                      </div>
                      <div className="col-span-1 font-mono text-xs text-muted-foreground">
                        {slot.pickInRound}
                      </div>
                      <div className="col-span-4 flex items-center gap-2">
                        <div
                          className="h-6 w-6 rounded-full flex items-center justify-center text-[7px] font-bold text-white shrink-0"
                          style={{ backgroundColor: team?.primaryColor || '#666' }}
                        >
                          {slot.teamCode}
                        </div>
                        <span className="text-xs font-medium truncate">{team?.name || slot.teamCode}</span>
                        {isTraded && (
                          <Badge className="text-[7px] h-3 px-0.5 bg-yellow-500/20 text-yellow-400 border-yellow-500/30">TRADED</Badge>
                        )}
                      </div>
                      <div className="col-span-3 flex gap-1 flex-wrap">
                        {team?.needs.slice(0, 3).map(need => (
                          <Badge key={need} variant="outline" className="text-[8px] h-3.5 px-1 font-mono border-border/50">
                            {need}
                          </Badge>
                        ))}
                      </div>
                      <div className="col-span-2 text-right">
                        {isUser ? (
                          <Badge className="bg-primary/20 text-primary border-primary/30 text-[9px] h-4 px-1.5">
                            <User className="h-2.5 w-2.5 mr-0.5" />
                            {controller.name}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[9px] h-4 px-1.5">
                            <Monitor className="h-2.5 w-2.5 mr-0.5" /> CPU
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : activeTab === 'settings' ? (
          <div className="max-h-[45vh] overflow-y-auto border rounded-md bg-muted/20 p-4 space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-card">
                <div className="space-y-1">
                  <Label className="text-sm font-bold flex items-center gap-2">
                    <ListOrdered className="h-4 w-4" /> Compensatory Picks
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Include compensatory picks in rounds 3-7.
                    {compPickCount > 0 && (
                      <span className="text-primary ml-1">({compPickCount} comp picks in selected rounds)</span>
                    )}
                  </p>
                </div>
                <Switch
                  checked={includeCompPicks}
                  onCheckedChange={setIncludeCompPicks}
                  data-testid="switch-comp-picks"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <ArrowLeftRight className="h-4 w-4" /> Pre-Draft Pick Trading
                </h3>
                {trades.length > 0 && (
                  <Button variant="ghost" size="sm" className="text-xs h-6 text-destructive" onClick={() => setTrades([])}>
                    Clear All Trades
                  </Button>
                )}
              </div>

              <div className="p-4 rounded-lg border border-border bg-card space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Team A</Label>
                    <Select value={tradeTeamA} onValueChange={(v) => { setTradeTeamA(v); setTradePickA(""); }}>
                      <SelectTrigger className="h-8 text-xs" data-testid="select-trade-team-a">
                        <SelectValue placeholder="Select team..." />
                      </SelectTrigger>
                      <SelectContent>
                        {sortedTeams.map(t => (
                          <SelectItem key={t.code} value={t.code} className="text-xs">
                            {t.code} - {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {tradeTeamA && (
                      <Select value={tradePickA} onValueChange={setTradePickA}>
                        <SelectTrigger className="h-8 text-xs" data-testid="select-trade-pick-a">
                          <SelectValue placeholder="Select pick..." />
                        </SelectTrigger>
                        <SelectContent>
                          {teamAPickOptions.map(s => (
                            <SelectItem key={s.overall} value={String(s.overall)} className="text-xs font-mono">
                              R{s.round} #{s.overall}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Team B</Label>
                    <Select value={tradeTeamB} onValueChange={(v) => { setTradeTeamB(v); setTradePickB(""); }}>
                      <SelectTrigger className="h-8 text-xs" data-testid="select-trade-team-b">
                        <SelectValue placeholder="Select team..." />
                      </SelectTrigger>
                      <SelectContent>
                        {sortedTeams.filter(t => t.code !== tradeTeamA).map(t => (
                          <SelectItem key={t.code} value={t.code} className="text-xs">
                            {t.code} - {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {tradeTeamB && (
                      <Select value={tradePickB} onValueChange={setTradePickB}>
                        <SelectTrigger className="h-8 text-xs" data-testid="select-trade-pick-b">
                          <SelectValue placeholder="Select pick (for swap)..." />
                        </SelectTrigger>
                        <SelectContent>
                          {teamBPickOptions.map(s => (
                            <SelectItem key={s.overall} value={String(s.overall)} className="text-xs font-mono">
                              R{s.round} #{s.overall}
                            </SelectItem>
                          ))}
                          <SelectItem value="none" className="text-xs italic text-muted-foreground">
                            No swap (reassign only)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  {tradePickB && tradePickB !== "none" ? (
                    <Button
                      size="sm"
                      className="gap-1.5 flex-1"
                      onClick={executeTrade}
                      disabled={!tradePickA || !tradePickB || tradePickB === "none"}
                      data-testid="button-execute-swap"
                    >
                      <Repeat2 className="h-3.5 w-3.5" /> Swap Picks
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      className="gap-1.5 flex-1"
                      onClick={executeReassign}
                      disabled={!tradePickA || !tradeTeamB}
                      data-testid="button-execute-reassign"
                    >
                      <ArrowLeftRight className="h-3.5 w-3.5" /> Move Pick to {tradeTeamB || '...'}
                    </Button>
                  )}
                </div>
              </div>

              {trades.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Active Trades</Label>
                  <div className="space-y-1">
                    {trades.map(trade => (
                      <div
                        key={trade.pickOverall}
                        className="flex items-center justify-between p-2 rounded-md bg-yellow-500/5 border border-yellow-500/20 text-xs"
                        data-testid={`trade-${trade.pickOverall}`}
                      >
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono text-[10px] h-5">#{trade.pickOverall}</Badge>
                          <div
                            className="h-5 w-5 rounded-full flex items-center justify-center text-[6px] font-bold text-white"
                            style={{ backgroundColor: teams[trade.fromTeam]?.primaryColor || '#666' }}
                          >
                            {trade.fromTeam}
                          </div>
                          <span className="text-muted-foreground">{trade.fromTeam}</span>
                          <ArrowLeftRight className="h-3 w-3 text-yellow-400" />
                          <div
                            className="h-5 w-5 rounded-full flex items-center justify-center text-[6px] font-bold text-white"
                            style={{ backgroundColor: teams[trade.toTeam]?.primaryColor || '#666' }}
                          >
                            {trade.toTeam}
                          </div>
                          <span className="text-muted-foreground">{trade.toTeam}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 text-destructive hover:text-destructive"
                          onClick={() => removeTrade(trade.pickOverall)}
                          data-testid={`button-remove-trade-${trade.pickOverall}`}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : activeTab === 'lottery' && sport === 'NBA' ? (
          <div className="max-h-[45vh] overflow-y-auto border rounded-md bg-muted/20 p-4 space-y-4">
            <div className="text-center space-y-3">
              <div className="space-y-1">
                <h3 className="text-lg font-display font-bold">NBA Draft Lottery Simulator</h3>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  14 ping-pong balls, 1,000 combinations. The bottom 3 teams each get 14.0% odds.
                  Top 4 picks determined by lottery, picks 5-14 by reverse record. The worst team cannot fall past 5th.
                </p>
              </div>

              <div className="flex justify-center gap-2">
                <Button
                  onClick={runLottery}
                  disabled={lotterySimulating}
                  className="gap-2"
                  data-testid="button-run-lottery"
                >
                  {lotterySimulating ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Drawing...
                    </>
                  ) : (
                    <>
                      <Dice5 className="h-4 w-4" />
                      {lotteryResults ? 'Re-Draw Lottery' : 'Run Lottery'}
                    </>
                  )}
                </Button>
                {lotteryResults && !lotteryApplied && lotteryRevealed >= 14 && (
                  <Button
                    onClick={applyLotteryResults}
                    variant="outline"
                    className="gap-2 border-green-500/50 text-green-400 hover:bg-green-500/10"
                    data-testid="button-apply-lottery"
                  >
                    <Trophy className="h-4 w-4" />
                    Apply to Draft Order
                  </Button>
                )}
                {lotteryResults && (
                  <Button
                    onClick={resetLottery}
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground"
                    data-testid="button-reset-lottery"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {lotterySimulating && (
              <div className="flex flex-col items-center gap-4 py-8">
                <div className="relative">
                  <div className="h-24 w-24 rounded-full border-4 border-primary/30 flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                    <Dice5 className="h-10 w-10 text-primary animate-pulse" />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground animate-pulse">Drawing combinations...</p>
              </div>
            )}

            {!lotteryResults && !lotterySimulating && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Pre-Lottery Odds</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {lotteryTeams.map((teamCode, i) => {
                    const team = teams[teamCode];
                    const combos = NBA_LOTTERY_COMBINATIONS[i];
                    const pct = ((combos / 1000) * 100).toFixed(1);
                    return (
                      <div
                        key={teamCode}
                        className="flex items-center gap-2 p-2 rounded-md bg-card border border-border"
                        data-testid={`lottery-odds-${teamCode}`}
                      >
                        <span className="text-xs font-mono text-muted-foreground w-5">{i + 1}</span>
                        <div
                          className="h-6 w-6 rounded-full flex items-center justify-center text-[7px] font-bold text-white shrink-0"
                          style={{ backgroundColor: team?.primaryColor || '#666' }}
                        >
                          {teamCode}
                        </div>
                        <span className="text-xs font-medium flex-1 truncate">{team?.name || teamCode}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-mono text-muted-foreground w-10 text-right">{pct}%</span>
                          <span className="text-[9px] text-muted-foreground w-12 text-right">{combos}/1000</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {lotteryResults && !lotterySimulating && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Lottery Results</h4>
                  {lotteryApplied && (
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-[9px]">
                      Applied to Draft Order
                    </Badge>
                  )}
                </div>
                <div className="space-y-1.5">
                  {lotteryResults.map((result, i) => {
                    const team = teams[result.teamCode];
                    const isRevealed = i < lotteryRevealed;
                    const isTopFour = result.newSlot <= 4;

                    return (
                      <div
                        key={result.teamCode}
                        className={cn(
                          "flex items-center gap-3 p-2.5 rounded-lg border transition-all duration-500",
                          !isRevealed && "opacity-0 translate-y-2",
                          isRevealed && "opacity-100 translate-y-0",
                          isTopFour && isRevealed
                            ? "bg-primary/10 border-primary/30"
                            : "bg-card border-border",
                        )}
                        style={{ transitionDelay: `${i * 50}ms` }}
                        data-testid={`lottery-result-${result.newSlot}`}
                      >
                        <div className={cn(
                          "h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                          isTopFour
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        )}>
                          {result.newSlot}
                        </div>

                        {isRevealed ? (
                          <>
                            <div
                              className="h-7 w-7 rounded-full flex items-center justify-center text-[8px] font-bold text-white shrink-0"
                              style={{ backgroundColor: team?.primaryColor || '#666' }}
                            >
                              {result.teamCode}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-bold truncate">{team?.name || result.teamCode}</div>
                              <div className="text-[10px] text-muted-foreground">
                                Pre-lottery: #{result.originalSlot} &middot; {result.odds} odds
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {result.movement !== 0 && (
                                <Badge
                                  className={cn(
                                    "text-[10px] h-5 px-1.5 gap-0.5",
                                    result.movement > 0
                                      ? "bg-green-500/20 text-green-400 border-green-500/30"
                                      : "bg-red-500/20 text-red-400 border-red-500/30"
                                  )}
                                >
                                  {result.movement > 0 ? (
                                    <ArrowUp className="h-3 w-3" />
                                  ) : (
                                    <ArrowDown className="h-3 w-3" />
                                  )}
                                  {Math.abs(result.movement)}
                                </Badge>
                              )}
                              {result.movement === 0 && (
                                <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                                  &mdash;
                                </Badge>
                              )}
                              {isTopFour && (
                                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[9px] h-5">
                                  <Trophy className="h-3 w-3 mr-0.5" /> LOTTERY
                                </Badge>
                              )}
                            </div>
                          </>
                        ) : (
                          <div className="flex-1 flex items-center gap-2">
                            <div className="h-7 w-7 rounded-full bg-muted animate-pulse shrink-0" />
                            <div className="h-4 w-32 rounded bg-muted animate-pulse" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : null}

        </div>

        <DialogFooter className="mt-4">
          <Button
            size="lg"
            className="w-full md:w-auto"
            onClick={() => onStart(controllers, { rounds: selectedRounds, includeCompPicks, trades })}
            data-testid="button-start-draft"
          >
            Start Draft ({adjustedSlots.length} picks, {selectedRounds} Round{selectedRounds > 1 ? 's' : ''})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import type { Team, DraftOrderEntry, FreeAgent } from "@shared/schema";
import { DollarSign, Briefcase, ListOrdered } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";
import { useSport } from "@/lib/sportContext";

export default function Teams() {
  const { sport } = useSport();
  const { data: teamsData, isLoading: teamsLoading } = useQuery<Team[]>({ queryKey: [`/api/teams?sport=${sport}`] });
  const { data: draftOrderData, isLoading: draftOrderLoading } = useQuery<DraftOrderEntry[]>({ queryKey: [`/api/draft-order?sport=${sport}`] });
  const { data: freeAgentsData, isLoading: freeAgentsLoading } = useQuery<FreeAgent[]>({ queryKey: [`/api/free-agents?sport=${sport}`] });

  const teamsLookup = useMemo(() => {
    if (!teamsData) return {} as Record<string, Team>;
    return teamsData.reduce<Record<string, Team>>((acc, team) => {
      acc[team.code] = team;
      return acc;
    }, {});
  }, [teamsData]);

  const draftOrder = useMemo(() => {
    if (!draftOrderData) return [];
    return [...draftOrderData].sort((a, b) => a.pickNumber - b.pickNumber).map(entry => entry.teamCode);
  }, [draftOrderData]);

  const [faPosition, setFaPosition] = useState("ALL");

  const faPositions = useMemo(() => {
    if (!freeAgentsData) return [];
    const posSet = new Set(freeAgentsData.map(fa => fa.position));
    return Array.from(posSet).sort();
  }, [freeAgentsData]);

  const filteredFreeAgents = useMemo(() => {
    if (!freeAgentsData) return [];
    if (faPosition === "ALL") return freeAgentsData;
    return freeAgentsData.filter(fa => fa.position === faPosition);
  }, [freeAgentsData, faPosition]);

  const isLoading = teamsLoading || draftOrderLoading || freeAgentsLoading;

  const getCapSpaceColor = (space: number) => {
    if (space > 40) return "text-emerald-500";
    if (space > 10) return "text-emerald-400";
    if (space > 0) return "text-yellow-500";
    return "text-red-500";
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 1
    }).format(amount) + "M";
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-muted-foreground">Loading team data...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl sm:text-3xl font-display font-bold text-foreground">Team & League Overview</h2>
          <p className="text-muted-foreground">Draft order, team cap space situations, and upcoming free agents.</p>
        </div>

        <Tabs defaultValue="draft-order" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="draft-order" className="gap-2">
              <ListOrdered className="h-4 w-4" /> Draft Order
            </TabsTrigger>
            <TabsTrigger value="cap-space" className="gap-2">
              <DollarSign className="h-4 w-4" /> Cap Space
            </TabsTrigger>
            <TabsTrigger value="free-agents" className="gap-2">
              <Briefcase className="h-4 w-4" /> Top Free Agents
            </TabsTrigger>
          </TabsList>

          <TabsContent value="draft-order">
            <Card>
              <CardHeader>
                <CardTitle>{sport === "NFL" ? "2026" : "2025"} {sport} Draft Order</CardTitle>
                <CardDescription>First round selection order based on 2025 season standings.</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px] pr-4">
                  <div className="space-y-2">
                    {draftOrder.map((teamCode, index) => {
                      const team = teamsLookup[teamCode];
                      if (!team) return null;
                      return (
                        <div key={index} className="flex items-center gap-4 p-4 rounded-lg border border-border bg-card/50 hover:bg-muted/50 transition-colors">
                          <div className="text-2xl font-display font-bold text-muted-foreground w-12">
                            {(index + 1).toString().padStart(2, '0')}
                          </div>
                          <div 
                            className="h-12 w-12 rounded-full flex items-center justify-center text-lg font-bold text-white shadow-sm"
                            style={{ backgroundColor: team.primaryColor }}
                          >
                            {teamCode}
                          </div>
                          <div className="flex-1">
                            <h3 className="font-bold text-lg">{team.name}</h3>
                            <div className="flex gap-2 text-xs text-muted-foreground">
                              Needs: {team.needs.map(need => (
                                <Badge key={need} variant="secondary" className="text-[10px] h-5">{need}</Badge>
                              ))}
                            </div>
                          </div>
                          <div className="hidden md:block text-right">
                             <div className="text-sm font-medium">Cap Space</div>
                             <div className={cn("text-lg font-mono font-bold", getCapSpaceColor(team.capSpace || 0))}>
                                {formatCurrency(team.capSpace || 0)}
                             </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cap-space">
            <Card>
              <CardHeader>
                <CardTitle>Team Salary Cap Situations</CardTitle>
                <CardDescription>{`Projected cap space for the ${sport === "NFL" ? "2026" : "2025"} offseason.`}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {Object.entries(teamsLookup)
                    .sort(([, a], [, b]) => (b.capSpace || 0) - (a.capSpace || 0))
                    .map(([code, team]) => (
                    <div key={code} className="flex flex-col p-4 rounded-lg border border-border bg-card/50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div 
                            className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                            style={{ backgroundColor: team.primaryColor }}
                          >
                            {code}
                          </div>
                          <span className="font-bold">{team.name}</span>
                        </div>
                      </div>
                      <Separator className="my-2" />
                      <div className="flex justify-between items-end mt-auto">
                        <span className="text-sm text-muted-foreground">Available Cap</span>
                        <span className={cn("text-2xl font-mono font-bold", getCapSpaceColor(team.capSpace || 0))}>
                          {formatCurrency(team.capSpace || 0)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="free-agents">
            <Card>
              <CardHeader>
                <CardTitle>{sport === "NFL" ? "2026" : "2025"} Free Agents</CardTitle>
                <CardDescription>Key players hitting the market this offseason ({filteredFreeAgents.length} players).</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="ALL" onValueChange={setFaPosition} className="mb-4">
                  <TabsList className="w-full justify-start overflow-x-auto no-scrollbar flex-wrap sm:flex-nowrap">
                    {["ALL", ...faPositions].map(pos => (
                      <TabsTrigger key={pos} value={pos} data-testid={`button-fa-pos-${pos}`}>{pos}</TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="hidden sm:table-cell">#</TableHead>
                      <TableHead>Player</TableHead>
                      <TableHead>Pos</TableHead>
                      <TableHead className="hidden md:table-cell">Age</TableHead>
                      <TableHead className="hidden lg:table-cell">Previous Team</TableHead>
                      <TableHead>AAV</TableHead>
                      <TableHead className="hidden sm:table-cell">Projected Contract</TableHead>
                      <TableHead className="hidden sm:table-cell">Tier</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredFreeAgents.map((fa, index) => (
                      <TableRow key={fa.id}>
                        <TableCell className="font-mono text-muted-foreground hidden sm:table-cell">{index + 1}</TableCell>
                        <TableCell>
                          <div className="font-bold text-foreground">{fa.name}</div>
                          <div className="text-xs text-muted-foreground sm:hidden">{fa.prevTeam} · Age {fa.age}</div>
                        </TableCell>
                        <TableCell><Badge variant="secondary">{fa.position}</Badge></TableCell>
                        <TableCell className="hidden md:table-cell">{fa.age}</TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <div className="flex items-center gap-2">
                            <div 
                              className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                              style={{ backgroundColor: teamsLookup[fa.prevTeam]?.primaryColor || '#333' }}
                            >
                              {fa.prevTeam}
                            </div>
                            <span>{teamsLookup[fa.prevTeam]?.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{formatCurrency(fa.marketValue)}<span className="hidden sm:inline"> / yr</span></TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <div className="font-mono text-sm">
                            <span className="text-foreground font-semibold">{fa.projectedTotal ? formatCurrency(fa.projectedTotal) : '—'}</span>
                            <span className="text-muted-foreground text-xs ml-1">/ {fa.projectedYears || '—'} yr{(fa.projectedYears || 0) !== 1 ? 's' : ''}</span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge 
                            variant="outline" 
                            className={cn(
                              fa.tier === 'Elite' && "border-amber-500 text-amber-500 bg-amber-500/10",
                              fa.tier === 'Starter' && "border-primary text-primary bg-primary/10"
                            )}
                          >
                            {fa.tier}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}

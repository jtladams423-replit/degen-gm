import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine,
  Cell,
  ScatterChart,
  Scatter,
  ZAxis
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import type { HistoricalPerformance } from "@shared/schema";
import { Badge } from "@/components/ui/badge";

export default function Analysis() {
  const { data, isLoading } = useQuery<HistoricalPerformance[]>({ queryKey: ["/api/historical-performance"] });

  if (isLoading || !data) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-muted-foreground">Loading analysis data...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h2 className="text-3xl font-display font-bold text-foreground">Performance Analysis</h2>
          <p className="text-muted-foreground">Historical value vs. reach analysis based on Career Approximate Value (AV).</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="col-span-1 lg:col-span-2">
            <CardHeader>
              <CardTitle>Value Added by Pick (2022-2023)</CardTitle>
              <CardDescription>
                Positive values indicate "Steals" (exceeded expected AV). Negative values indicate "Reaches".
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="player" tick={{fill: 'hsl(var(--muted-foreground))'}} stroke="transparent" />
                  <YAxis tick={{fill: 'hsl(var(--muted-foreground))'}} stroke="transparent" label={{ value: 'Value Differential (AV)', angle: -90, position: 'insideLeft', fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip 
                    cursor={{fill: 'hsl(var(--muted)/0.3)'}}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
                  />
                  <ReferenceLine y={0} stroke="hsl(var(--foreground))" />
                  <Bar dataKey="valueDiff" radius={[4, 4, 0, 0]}>
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.valueDiff > 0 ? 'hsl(var(--chart-2))' : 'hsl(var(--destructive))'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top Steals</CardTitle>
              <CardDescription>Highest value-over-expectation picks.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.filter(d => d.valueDiff > 0).sort((a, b) => b.valueDiff - a.valueDiff).slice(0, 3).map((player) => (
                  <div key={player.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border border-border">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-chart-2/20 flex items-center justify-center text-chart-2 font-bold">
                        +{player.valueDiff}
                      </div>
                      <div>
                        <p className="font-bold">{player.player}</p>
                        <p className="text-xs text-muted-foreground">{player.team} • Pick {player.pick} • {player.year}</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="bg-chart-2/10 text-chart-2 hover:bg-chart-2/20">Steal</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notable Reaches</CardTitle>
              <CardDescription>Lowest value-over-expectation picks.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.filter(d => d.valueDiff < 0).sort((a, b) => a.valueDiff - b.valueDiff).slice(0, 3).map((player) => (
                  <div key={player.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border border-border">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-destructive/20 flex items-center justify-center text-destructive font-bold">
                        {player.valueDiff}
                      </div>
                      <div>
                        <p className="font-bold">{player.player}</p>
                        <p className="text-xs text-muted-foreground">{player.team} • Pick {player.pick} • {player.year}</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="bg-destructive/10 text-destructive hover:bg-destructive/20">Reach</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}

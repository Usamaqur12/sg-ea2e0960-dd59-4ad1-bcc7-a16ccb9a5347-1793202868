import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { Calendar, RefreshCw, Trophy } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getSportsbookResults, type SportsbookResult } from "@/services/discoveryService";

export default function ResultsPage() {
  const router = useRouter();
  const [results, setResults] = useState<SportsbookResult[]>([]);
  const [sport, setSport] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadResults = useCallback(async () => {
    setLoading(true);
    setError(null);
    const response = await getSportsbookResults({ limit: 150 });
    setResults(response.results);
    setError(response.error || null);
    setLoading(false);
  }, []);

  useEffect(() => { void loadResults(); }, [loadResults]);

  const sports = useMemo(
    () => [...new Map(results.map((result) => [result.sportSlug, result.sport])).entries()],
    [results]
  );
  const filtered = sport === "all" ? results : results.filter((result) => result.sportSlug === sport);

  return (
    <div className="min-h-screen flex flex-col bg-background pb-14 lg:pb-0">
      <Header user={null} onAuthClick={() => void router.push("/auth/login")} />

      <main className="flex-1 container py-6">
        <div className="max-w-5xl mx-auto space-y-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Trophy className="h-6 w-6 text-primary" />
              <div><h1 className="text-2xl font-bold">Results</h1><p className="text-xs text-muted-foreground">Verified final scores and settled market outcomes</p></div>
            </div>
            <Button variant="outline" size="sm" onClick={() => void loadResults()} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />Refresh
            </Button>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            <Button size="sm" variant={sport === "all" ? "default" : "outline"} onClick={() => setSport("all")}>All</Button>
            {sports.map(([slug, name]) => (
              <Button key={slug} size="sm" variant={sport === slug ? "default" : "outline"} onClick={() => setSport(slug)}>{name}</Button>
            ))}
          </div>

          {loading ? (
            <Card className="surface"><CardContent className="py-12 text-center text-sm text-muted-foreground">Loading verified results…</CardContent></Card>
          ) : error ? (
            <Card className="surface border-danger/30"><CardContent className="py-12 text-center text-sm text-danger">Results feed unavailable: {error}</CardContent></Card>
          ) : filtered.length === 0 ? (
            <Card className="surface"><CardContent className="flex flex-col items-center justify-center py-12"><Calendar className="h-12 w-12 text-muted-foreground mb-3" /><p className="font-medium">No completed events yet</p><p className="text-sm text-muted-foreground">Provider-confirmed results will appear automatically.</p></CardContent></Card>
          ) : (
            <div className="space-y-3">
              {filtered.map((result) => (
                <Card key={result.id} className="surface overflow-hidden">
                  <CardContent className="p-0">
                    <div className="flex items-center justify-between gap-4 p-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-2"><Badge variant="outline">{result.sport}</Badge><span className="text-xs text-muted-foreground truncate">{result.league}</span></div>
                        <div className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 max-w-md">
                          <span className="font-semibold truncate">{result.homeTeam}</span><span className="font-mono text-lg font-black">{result.status === "cancelled" ? "–" : result.homeScore ?? "–"}</span>
                          <span className="font-semibold truncate">{result.awayTeam}</span><span className="font-mono text-lg font-black">{result.status === "cancelled" ? "–" : result.awayScore ?? "–"}</span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0"><Badge variant={result.status === "cancelled" ? "secondary" : "default"}>{result.status === "cancelled" ? "Cancelled" : "Final"}</Badge><p className="text-[11px] text-muted-foreground mt-2">{new Date(result.startTime).toLocaleString()}</p></div>
                    </div>
                    {result.settledMarkets.length > 0 && (
                      <div className="border-t border-border bg-muted/10 px-4 py-3 flex flex-wrap gap-2">
                        {result.settledMarkets.map((market) => <Badge key={market.id} variant="secondary" className="font-normal">{market.name}: <span className="font-bold ml-1">{market.result}</span></Badge>)}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
      <MobileBottomNav />
    </div>
  );
}

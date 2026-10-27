import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Trophy, 
  Activity,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";

interface WalletData {
  balance: number;
  bonus_balance: number;
}

interface BetData {
  id: string;
  type: string;
  stake: number;
  total_odds: number;
  potential_return: number;
  status: string;
  created_at: string;
  settled_at: string | null;
  payout: number | null;
  selections: Array<{
    event: {
      home_team: string;
      away_team: string;
      start_time: string;
    };
    selection: string;
    odds_value: number;
    result: string;
  }>;
}

interface BettingStats {
  totalBets: number;
  wonBets: number;
  lostBets: number;
  pendingBets: number;
  totalWagered: number;
  totalWon: number;
  totalLost: number;
  biggestWin: number;
  winRate: number;
  roi: number;
}

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [recentBets, setRecentBets] = useState<BetData[]>([]);
  const [stats, setStats] = useState<BettingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "pending" | "won" | "lost">("all");

  useEffect(() => {
    void checkAuth();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        void loadDashboardData(session.user.id);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    setUser(session?.user ?? null);
    if (session?.user) {
      await loadDashboardData(session.user.id);
    } else {
      router.push("/auth/login");
    }
  }

  async function loadDashboardData(userId: string) {
    setLoading(true);
    try {
      await Promise.all([
        loadWallet(userId),
        loadRecentBets(userId),
        loadStats(userId),
      ]);
    } catch (error) {
      console.error("Failed to load dashboard:", error);
    } finally {
      setLoading(false);
    }
  }

  async function loadWallet(userId: string) {
    const { data } = await supabase
      .from("wallet_accounts")
      .select("balance, bonus_balance")
      .eq("user_id", userId)
      .single();
    setWallet(data);
  }

  async function loadRecentBets(userId: string) {
    const { data } = await supabase
      .from("bets")
      .select(`
        id,
        type,
        stake,
        total_odds,
        potential_return,
        status,
        created_at,
        settled_at,
        payout,
        bet_selections (
          selection,
          odds_value,
          result,
          event:events (
            home_team,
            away_team,
            start_time
          )
        )
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (data) {
      setRecentBets(data.map(bet => ({
        ...bet,
        selections: (bet.bet_selections as any[]).map(sel => ({
          event: sel.event,
          selection: sel.selection,
          odds_value: sel.odds_value,
          result: sel.result,
        })),
      })));
    }
  }

  async function loadStats(userId: string) {
    const { data: bets } = await supabase
      .from("bets")
      .select("stake, status, payout")
      .eq("user_id", userId);

    if (!bets || bets.length === 0) {
      setStats({
        totalBets: 0,
        wonBets: 0,
        lostBets: 0,
        pendingBets: 0,
        totalWagered: 0,
        totalWon: 0,
        totalLost: 0,
        biggestWin: 0,
        winRate: 0,
        roi: 0,
      });
      return;
    }

    const totalBets = bets.length;
    const wonBets = bets.filter(b => b.status === "won").length;
    const lostBets = bets.filter(b => b.status === "lost").length;
    const pendingBets = bets.filter(b => b.status === "pending").length;
    const totalWagered = bets.reduce((sum, b) => sum + Number(b.stake), 0);
    const totalWon = bets.filter(b => b.status === "won").reduce((sum, b) => sum + Number(b.payout || 0), 0);
    const totalLost = bets.filter(b => b.status === "lost").reduce((sum, b) => sum + Number(b.stake), 0);
    const biggestWin = Math.max(...bets.filter(b => b.status === "won").map(b => Number(b.payout || 0)), 0);
    const winRate = totalBets > 0 ? (wonBets / (wonBets + lostBets)) * 100 : 0;
    const netProfit = totalWon - totalLost;
    const roi = totalWagered > 0 ? (netProfit / totalWagered) * 100 : 0;

    setStats({
      totalBets,
      wonBets,
      lostBets,
      pendingBets,
      totalWagered,
      totalWon,
      totalLost,
      biggestWin,
      winRate,
      roi,
    });
  }

  const filteredBets = recentBets.filter(bet => {
    if (activeTab === "all") return true;
    return bet.status === activeTab;
  });

  const statCards = [
    {
      title: "Total Bets",
      value: stats?.totalBets || 0,
      icon: Activity,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      title: "Win Rate",
      value: `${stats?.winRate.toFixed(1) || 0}%`,
      icon: Trophy,
      color: "text-gold",
      bg: "bg-gold/10",
    },
    {
      title: "Total Wagered",
      value: `$${stats?.totalWagered.toFixed(2) || "0.00"}`,
      icon: DollarSign,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
    },
    {
      title: "Net Profit",
      value: `$${((stats?.totalWon || 0) - (stats?.totalLost || 0)).toFixed(2)}`,
      icon: (stats?.totalWon || 0) >= (stats?.totalLost || 0) ? TrendingUp : TrendingDown,
      color: (stats?.totalWon || 0) >= (stats?.totalLost || 0) ? "text-success" : "text-danger",
      bg: (stats?.totalWon || 0) >= (stats?.totalLost || 0) ? "bg-success/10" : "bg-danger/10",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient flex flex-col">
      <Header
        user={user ? { email: user.email || "", balance: wallet?.balance || 0 } : null}
        onAuthClick={() => router.push("/auth/login")}
      />

      <main className="flex-1 container mx-auto px-4 py-6 space-y-6">
        {/* Balance Card */}
        <Card className="surface border-border p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Balance</p>
              <h1 className="text-4xl font-black text-foreground">
                ${(wallet?.balance || 0).toFixed(2)}
              </h1>
              {(wallet?.bonus_balance || 0) > 0 && (
                <p className="text-sm text-muted-foreground mt-1">
                  + ${wallet?.bonus_balance.toFixed(2)} bonus
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button asChild>
                <Link href="/account/wallet">
                  <DollarSign className="h-4 w-4 mr-2" />
                  Manage Wallet
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/sports">
                  Place Bet
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </div>
          </div>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title} className="surface border-border p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <div className={`p-2 rounded-lg ${stat.bg}`}>
                    <Icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                </div>
                <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
              </Card>
            );
          })}
        </div>

        {/* Recent Bets */}
        <Card className="surface border-border">
          <div className="p-4 border-b border-border">
            <h2 className="text-lg font-black">Recent Bets</h2>
          </div>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="w-full">
            <div className="px-4 pt-4">
              <TabsList className="w-full grid grid-cols-4">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="pending">
                  Pending
                  {stats && stats.pendingBets > 0 && (
                    <Badge variant="secondary" className="ml-2 h-5 min-w-5 px-1.5">
                      {stats.pendingBets}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="won">Won</TabsTrigger>
                <TabsTrigger value="lost">Lost</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value={activeTab} className="p-4 space-y-3">
              {loading ? (
                <div className="py-8 text-center text-muted-foreground">Loading...</div>
              ) : filteredBets.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-muted-foreground mb-4">No {activeTab !== "all" ? activeTab : ""} bets found</p>
                  <Button asChild size="sm">
                    <Link href="/sports">Place Your First Bet</Link>
                  </Button>
                </div>
              ) : (
                filteredBets.map((bet) => (
                  <div key={bet.id} className="surface-elevated rounded-lg p-4 border border-border hover:border-primary/50 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Badge variant={
                          bet.status === "won" ? "default" :
                          bet.status === "lost" ? "destructive" :
                          bet.status === "pending" ? "secondary" : "outline"
                        }>
                          {bet.status === "pending" && <Clock className="h-3 w-3 mr-1" />}
                          {bet.status === "won" && <CheckCircle2 className="h-3 w-3 mr-1" />}
                          {bet.status === "lost" && <XCircle className="h-3 w-3 mr-1" />}
                          {bet.status.charAt(0).toUpperCase() + bet.status.slice(1)}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {bet.type.charAt(0).toUpperCase() + bet.type.slice(1)}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">
                          {new Date(bet.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 mb-3">
                      {bet.selections.map((sel, idx) => (
                        <div key={idx} className="text-sm">
                          <p className="font-bold">
                            {sel.event.home_team} vs {sel.event.away_team}
                          </p>
                          <p className="text-muted-foreground">
                            {sel.selection} @ {sel.odds_value.toFixed(2)}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between text-sm pt-3 border-t border-border">
                      <div>
                        <p className="text-muted-foreground">Stake</p>
                        <p className="font-bold">${bet.stake.toFixed(2)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-muted-foreground">Odds</p>
                        <p className="font-bold">{bet.total_odds.toFixed(2)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-muted-foreground">
                          {bet.status === "won" ? "Won" : "To Win"}
                        </p>
                        <p className={`font-black ${bet.status === "won" ? "text-success" : ""}`}>
                          ${(bet.payout || bet.potential_return).toFixed(2)}
                          {bet.status === "won" && (
                            <ArrowUpRight className="inline h-4 w-4 ml-1" />
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </TabsContent>
          </Tabs>

          {filteredBets.length > 0 && (
            <div className="p-4 border-t border-border text-center">
              <Button asChild variant="ghost" size="sm">
                <Link href="/account/bets">
                  View All Bets
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </div>
          )}
        </Card>
      </main>

      <Footer />
    </div>
  );
}
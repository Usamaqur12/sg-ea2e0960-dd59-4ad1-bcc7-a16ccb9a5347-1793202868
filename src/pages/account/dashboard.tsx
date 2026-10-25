import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import { getUserBets, cancelBet } from "@/services/bettingService";
import { getUserTransactions } from "@/services/walletService";
import { getNotifications, markNotificationAsRead } from "@/services/notificationsService";
import { calculateCashoutOffer, processCashout } from "@/services/cashoutService";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  User, Wallet, Receipt, TrendingUp, ArrowDownRight, ArrowUpRight,
  Clock, Trophy, Star, Gift, Bell, RefreshCw, Download, Filter,
  Search, CheckCircle, XCircle, AlertTriangle, BarChart3, Calendar,
  Settings, LogOut, ChevronRight, Banknote, LockKeyhole, CreditCard,
  DollarSign, Activity, Target, Zap, ArrowLeft
} from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";

interface DisplayBet {
  id: string; type: string; status: string; stake: number; totalOdds: number;
  potentialReturn: number; payout: number; createdAt: string;
  selections: Array<{ selection: string; odds: number; result?: string }>;
}

export default function UserDashboard() {
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [bets, setBets] = useState<DisplayBet[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [betFilter, setBetFilter] = useState("active");
  const [transactionFilter, setTransactionFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState("7d");

  const [stats, setStats] = useState({
    totalBets: 0,
    activeBets: 0,
    wonBets: 0,
    lostBets: 0,
    totalWinnings: 0,
    winRate: 0,
    avgOdds: 0,
    profitLoss: 0,
  });

  useEffect(() => {
    initializeDashboard();
  }, []);

  async function initializeDashboard() {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    
    if (!authUser) {
      router.push("/auth/login");
      return;
    }

    setUser(authUser);

    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", authUser.id)
      .single();

    if (profileData) {
      setProfile(profileData);
      await Promise.all([
        loadBets(authUser.id),
        loadTransactions(authUser.id),
        loadNotifications(),
      ]);
    }
  }

  async function loadBets(userId: string) {
    const result = await getUserBets(userId, undefined, 100);
    if (result.success && result.bets) {
      const normalizedBets = result.bets.map((bet: any) => ({
        id: bet.id,
        type: bet.type || bet.bet_type || "single",
        status: bet.status || "pending",
        stake: Number(bet.stake || 0),
        totalOdds: Number(bet.total_odds ?? bet.totalOdds ?? 0),
        potentialReturn: Number(bet.potential_return ?? bet.potentialReturn ?? 0),
        payout: Number(bet.payout || 0),
        createdAt: bet.created_at || bet.placed_at || new Date().toISOString(),
        selections: (bet.bet_selections || bet.selections || []).map((s: any) => ({
          selection: s.selection,
          odds: Number(s.odds_value ?? s.oddsValue ?? 0),
          result: s.result,
        })),
      }));
      setBets(normalizedBets);
      calculateStats(normalizedBets);
    }
    setLoading(false);
  }

  async function loadTransactions(userId: string) {
    const { success, transactions: txs } = await getUserTransactions(userId);
    if (success && txs) {
      setTransactions(txs);
    }
  }

  async function loadNotifications() {
    const result = await getNotifications(20);
    setNotifications(result.notifications);
  }

  function calculateStats(betsData: DisplayBet[]) {
    const totalBets = betsData.length;
    const activeBets = betsData.filter(b => b.status === "pending").length;
    const wonBets = betsData.filter(b => b.status === "won").length;
    const lostBets = betsData.filter(b => b.status === "lost").length;
    const totalWinnings = betsData
      .filter(b => b.status === "won")
      .reduce((sum, b) => sum + b.payout, 0);
    const totalStake = betsData.reduce((sum, b) => sum + b.stake, 0);
    const winRate = totalBets > 0 ? (wonBets / totalBets) * 100 : 0;
    const avgOdds = betsData.length > 0 
      ? betsData.reduce((sum, b) => sum + b.totalOdds, 0) / betsData.length 
      : 0;
    const profitLoss = totalWinnings - totalStake;

    setStats({
      totalBets,
      activeBets,
      wonBets,
      lostBets,
      totalWinnings,
      winRate,
      avgOdds,
      profitLoss,
    });
  }

  async function handleRefresh() {
    if (!user) return;
    setLoading(true);
    await Promise.all([
      loadBets(user.id),
      loadTransactions(user.id),
      loadNotifications(),
    ]);
  }

  async function handleMarkNotificationRead(notificationId: string) {
    await markNotificationAsRead(notificationId);
    await loadNotifications();
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  const filteredBets = useMemo(() => {
    let filtered = bets;

    if (betFilter !== "all") {
      if (betFilter === "active") {
        filtered = filtered.filter(b => b.status === "pending");
      } else {
        filtered = filtered.filter(b => b.status === betFilter);
      }
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(b => 
        b.id.toLowerCase().includes(term) ||
        b.selections.some(s => s.selection.toLowerCase().includes(term))
      );
    }

    return filtered;
  }, [bets, betFilter, searchTerm]);

  const filteredTransactions = useMemo(() => {
    let filtered = transactions;

    if (transactionFilter !== "all") {
      filtered = filtered.filter(t => t.type === transactionFilter);
    }

    if (searchTerm && activeTab === "transactions") {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(t => 
        t.description?.toLowerCase().includes(term)
      );
    }

    return filtered;
  }, [transactions, transactionFilter, searchTerm, activeTab]);

  function exportData(type: "bets" | "transactions") {
    const data = type === "bets" ? filteredBets : filteredTransactions;
    const headers = type === "bets" 
      ? ["ID", "Date", "Type", "Status", "Stake", "Odds", "Potential", "Payout"]
      : ["ID", "Date", "Type", "Description", "Amount", "Balance"];
    
    const rows = data.map(item => {
      if (type === "bets") {
        const bet = item as DisplayBet;
        return [bet.id, bet.createdAt, bet.type, bet.status, bet.stake, bet.totalOdds, bet.potentialReturn, bet.payout];
      } else {
        return [item.id, item.created_at, item.type, item.description, item.amount, item.balance_after];
      }
    }).map(row => row.map(val => `"${String(val).replaceAll('"', '""')}"`).join(","));

    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `primebet-${type}-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="min-h-screen flex flex-col bg-background pb-14 lg:pb-0">
      <Header
        user={profile ? { email: user?.email || "", balance: profile.demo_balance || 0 } : null}
        onAuthClick={() => router.push("/auth/login")}
      />

      <main className="flex-1 container py-4 md:py-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Link href="/account">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <BarChart3 className="h-6 w-6 text-primary" />
                  Dashboard
                </h1>
                <p className="text-sm text-muted-foreground">
                  Complete overview of your betting activity
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleRefresh} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">
                <Activity className="h-4 w-4 mr-2" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="bets">
                <Receipt className="h-4 w-4 mr-2" />
                Bets ({stats.activeBets})
              </TabsTrigger>
              <TabsTrigger value="transactions">
                <Wallet className="h-4 w-4 mr-2" />
                Transactions
              </TabsTrigger>
              <TabsTrigger value="notifications">
                <Bell className="h-4 w-4 mr-2" />
                Alerts {unreadCount > 0 && `(${unreadCount})`}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card className="surface">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Wallet className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="text-xl font-bold font-mono">${profile?.demo_balance?.toFixed(0) || 0}</div>
                        <div className="text-xs text-muted-foreground">Balance</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="surface">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center">
                        <Activity className="h-5 w-5 text-warning" />
                      </div>
                      <div>
                        <div className="text-xl font-bold">{stats.activeBets}</div>
                        <div className="text-xs text-muted-foreground">Active Bets</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="surface">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                        <Trophy className="h-5 w-5 text-success" />
                      </div>
                      <div>
                        <div className="text-xl font-bold">{stats.wonBets}</div>
                        <div className="text-xs text-muted-foreground">Wins</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="surface">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center">
                        <DollarSign className="h-5 w-5 text-gold" />
                      </div>
                      <div>
                        <div className="text-xl font-bold font-mono">{stats.winRate.toFixed(0)}%</div>
                        <div className="text-xs text-muted-foreground">Win Rate</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="surface md:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-lg">Performance Stats</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-lg border border-border">
                      <div className="text-xs text-muted-foreground mb-1">Total Bets</div>
                      <div className="text-2xl font-bold">{stats.totalBets}</div>
                    </div>
                    <div className="p-3 rounded-lg border border-border">
                      <div className="text-xs text-muted-foreground mb-1">Avg Odds</div>
                      <div className="text-2xl font-bold font-mono">{stats.avgOdds.toFixed(2)}</div>
                    </div>
                    <div className="p-3 rounded-lg border border-border">
                      <div className="text-xs text-muted-foreground mb-1">Total Winnings</div>
                      <div className="text-2xl font-bold font-mono text-success">${stats.totalWinnings.toFixed(0)}</div>
                    </div>
                    <div className="p-3 rounded-lg border border-border">
                      <div className="text-xs text-muted-foreground mb-1">Profit/Loss</div>
                      <div className={`text-2xl font-bold font-mono ${stats.profitLoss >= 0 ? "text-success" : "text-danger"}`}>
                        {stats.profitLoss >= 0 ? "+" : ""}${stats.profitLoss.toFixed(0)}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="surface">
                  <CardHeader>
                    <CardTitle className="text-lg">Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Link href="/account/wallet">
                      <Button variant="outline" className="w-full justify-start">
                        <Wallet className="h-4 w-4 mr-2" />
                        Manage Wallet
                      </Button>
                    </Link>
                    <Link href="/account/settings">
                      <Button variant="outline" className="w-full justify-start">
                        <Settings className="h-4 w-4 mr-2" />
                        Settings
                      </Button>
                    </Link>
                    <Link href="/promotions">
                      <Button variant="outline" className="w-full justify-start">
                        <Gift className="h-4 w-4 mr-2" />
                        Promotions
                      </Button>
                    </Link>
                    <Link href="/rewards">
                      <Button variant="outline" className="w-full justify-start">
                        <Star className="h-4 w-4 mr-2" />
                        Rewards
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="surface">
                  <CardHeader>
                    <CardTitle className="text-lg">Recent Active Bets</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-64">
                      <div className="space-y-2">
                        {bets.filter(b => b.status === "pending").slice(0, 5).map(bet => (
                          <div key={bet.id} className="p-3 rounded-lg border border-border hover:border-primary/30 transition-colors">
                            <div className="flex items-start justify-between mb-2">
                              <div className="text-sm font-semibold capitalize">{bet.type} bet</div>
                              <Badge variant="outline" className="text-xs">
                                <Clock className="h-3 w-3 mr-1" />
                                Open
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground mb-2">
                              {bet.selections.map(s => s.selection).join(" · ")}
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">Stake: ${bet.stake.toFixed(2)}</span>
                              <span className="font-mono font-bold text-success">Potential: ${bet.potentialReturn.toFixed(2)}</span>
                            </div>
                          </div>
                        ))}
                        {bets.filter(b => b.status === "pending").length === 0 && (
                          <div className="text-center py-8 text-muted-foreground">
                            <Receipt className="h-12 w-12 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No active bets</p>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>

                <Card className="surface">
                  <CardHeader>
                    <CardTitle className="text-lg">Recent Transactions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-64">
                      <div className="space-y-2">
                        {transactions.slice(0, 5).map(tx => (
                          <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${tx.amount > 0 ? "bg-success/10" : "bg-danger/10"}`}>
                                {tx.amount > 0 ? (
                                  <ArrowDownRight className="h-4 w-4 text-success" />
                                ) : (
                                  <ArrowUpRight className="h-4 w-4 text-danger" />
                                )}
                              </div>
                              <div>
                                <div className="text-sm font-medium">{tx.description}</div>
                                <div className="text-xs text-muted-foreground">
                                  {new Date(tx.created_at).toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                            <div className={`text-sm font-bold font-mono ${tx.amount > 0 ? "text-success" : "text-danger"}`}>
                              {tx.amount > 0 ? "+" : ""}${Math.abs(tx.amount).toFixed(2)}
                            </div>
                          </div>
                        ))}
                        {transactions.length === 0 && (
                          <div className="text-center py-8 text-muted-foreground">
                            <Wallet className="h-12 w-12 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No transactions yet</p>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="bets" className="space-y-4">
              <div className="flex flex-col md:flex-row gap-3 mb-4">
                <div className="flex gap-2">
                  <Button variant={betFilter === "all" ? "default" : "outline"} size="sm" onClick={() => setBetFilter("all")}>
                    All
                  </Button>
                  <Button variant={betFilter === "active" ? "default" : "outline"} size="sm" onClick={() => setBetFilter("active")}>
                    Active ({stats.activeBets})
                  </Button>
                  <Button variant={betFilter === "won" ? "default" : "outline"} size="sm" onClick={() => setBetFilter("won")}>
                    Won
                  </Button>
                  <Button variant={betFilter === "lost" ? "default" : "outline"} size="sm" onClick={() => setBetFilter("lost")}>
                    Lost
                  </Button>
                </div>
                <div className="flex gap-2 flex-1">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search bets..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Button variant="outline" onClick={() => exportData("bets")}>
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                {loading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-40 animate-pulse rounded-lg bg-surface" />
                    ))}
                  </div>
                ) : filteredBets.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <Receipt className="h-12 w-12 mb-3 text-muted-foreground" />
                      <p className="font-medium">No bets found</p>
                      <p className="text-sm text-muted-foreground">Try adjusting your filters</p>
                    </CardContent>
                  </Card>
                ) : (
                  filteredBets.map(bet => (
                    <BetDetailCard key={bet.id} bet={bet} userId={user.id} onRefresh={handleRefresh} />
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="transactions" className="space-y-4">
              <div className="flex flex-col md:flex-row gap-3 mb-4">
                <div className="flex gap-2">
                  <Button variant={transactionFilter === "all" ? "default" : "outline"} size="sm" onClick={() => setTransactionFilter("all")}>
                    All
                  </Button>
                  <Button variant={transactionFilter === "deposit" ? "default" : "outline"} size="sm" onClick={() => setTransactionFilter("deposit")}>
                    Deposits
                  </Button>
                  <Button variant={transactionFilter === "bet_stake" ? "default" : "outline"} size="sm" onClick={() => setTransactionFilter("bet_stake")}>
                    Bets
                  </Button>
                  <Button variant={transactionFilter === "bet_won" ? "default" : "outline"} size="sm" onClick={() => setTransactionFilter("bet_won")}>
                    Wins
                  </Button>
                </div>
                <div className="flex gap-2 flex-1">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search transactions..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Button variant="outline" onClick={() => exportData("transactions")}>
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                {filteredTransactions.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <Wallet className="h-12 w-12 mb-3 text-muted-foreground" />
                      <p className="font-medium">No transactions found</p>
                      <p className="text-sm text-muted-foreground">Try adjusting your filters</p>
                    </CardContent>
                  </Card>
                ) : (
                  filteredTransactions.map(tx => (
                    <Card key={tx.id} className="surface">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.amount > 0 ? "bg-success/10" : "bg-danger/10"}`}>
                              {tx.amount > 0 ? (
                                <ArrowDownRight className="h-5 w-5 text-success" />
                              ) : (
                                <ArrowUpRight className="h-5 w-5 text-danger" />
                              )}
                            </div>
                            <div>
                              <div className="text-sm font-semibold">{tx.description}</div>
                              <div className="text-xs text-muted-foreground">
                                {new Date(tx.created_at).toLocaleString()}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`text-sm font-bold font-mono ${tx.amount > 0 ? "text-success" : "text-danger"}`}>
                              {tx.amount > 0 ? "+" : ""}${Math.abs(tx.amount).toFixed(2)}
                            </div>
                            <div className="text-xs text-muted-foreground font-mono">
                              Balance: ${tx.balance_after.toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="notifications" className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold">Notifications</h3>
                  <p className="text-sm text-muted-foreground">{unreadCount} unread</p>
                </div>
              </div>

              <div className="space-y-2">
                {notifications.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <Bell className="h-12 w-12 mb-3 text-muted-foreground" />
                      <p className="font-medium">No notifications</p>
                      <p className="text-sm text-muted-foreground">You're all caught up!</p>
                    </CardContent>
                  </Card>
                ) : (
                  notifications.map(notification => (
                    <Alert 
                      key={notification.id}
                      className={notification.is_read ? "opacity-60" : "border-primary/30"}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <AlertTitle className="text-sm font-bold mb-1">
                            {notification.title}
                          </AlertTitle>
                          <AlertDescription className="text-sm">
                            {notification.message}
                          </AlertDescription>
                          <p className="text-xs text-muted-foreground mt-2">
                            {new Date(notification.created_at).toLocaleString()}
                          </p>
                        </div>
                        {!notification.is_read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMarkNotificationRead(notification.id)}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </Alert>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />
      <MobileBottomNav />
    </div>
  );
}

function BetDetailCard({ bet, userId, onRefresh }: { bet: DisplayBet; userId: string; onRefresh: () => void }) {
  const { toast } = useToast();
  const [cancelling, setCancelling] = useState(false);
  const [cashingOut, setCashingOut] = useState(false);
  const [cashoutOffer, setCashoutOffer] = useState<number | null>(null);

  const canCancel = bet.status === "pending" && Date.now() - new Date(bet.createdAt).getTime() <= 5 * 60_000;

  async function handleCancel() {
    if (!window.confirm("Cancel this bet and refund the stake?")) return;
    setCancelling(true);
    const result = await cancelBet(userId, bet.id);
    if (!result.success) {
      toast({ title: "Cancel failed", description: result.error, variant: "destructive" });
    } else {
      toast({ title: "Bet cancelled", description: "Stake refunded to wallet" });
      onRefresh();
    }
    setCancelling(false);
  }

  async function getCashoutOffer() {
    setCashingOut(true);
    const result = await calculateCashoutOffer(bet.id);
    if (result.success && result.offer) {
      setCashoutOffer(result.offer.cashoutAmount);
    } else {
      toast({ title: "Cash-out unavailable", description: result.error, variant: "destructive" });
    }
    setCashingOut(false);
  }

  async function acceptCashout() {
    if (!cashoutOffer) return;
    setCashingOut(true);
    const result = await processCashout(bet.id, userId, "full");
    if (!result.success) {
      toast({ title: "Cash-out failed", description: result.error, variant: "destructive" });
    } else {
      toast({ title: "Bet cashed out", description: `$${Number(result.cashoutAmount).toFixed(2)} credited` });
      onRefresh();
    }
    setCashingOut(false);
  }

  return (
    <Card className={bet.status === "won" ? "border-success/30" : bet.status === "lost" ? "border-danger/30" : ""}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-sm capitalize">{bet.type} bet</CardTitle>
            <p className="text-xs text-muted-foreground font-mono mt-1">
              {bet.id.slice(0, 12)} · {new Date(bet.createdAt).toLocaleString()}
            </p>
          </div>
          <Badge variant={bet.status === "pending" ? "outline" : bet.status === "won" ? "default" : "destructive"} className={bet.status === "won" ? "bg-success/15 text-success" : ""}>
            {bet.status === "pending" && <Clock className="h-3 w-3 mr-1" />}
            {bet.status === "won" && <CheckCircle className="h-3 w-3 mr-1" />}
            {bet.status === "lost" && <XCircle className="h-3 w-3 mr-1" />}
            {bet.status === "pending" ? "Open" : bet.status === "won" ? "Won" : "Lost"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-2">
          {bet.selections.map((sel, idx) => (
            <div key={idx} className="p-2.5 rounded border border-border bg-background/50 text-xs">
              <div className="flex justify-between gap-3">
                <span className="font-medium">{sel.selection}</span>
                <span className="font-mono font-bold text-primary">{sel.odds.toFixed(2)}</span>
              </div>
              {sel.result && sel.result !== "pending" && (
                <span className="mt-1 block capitalize text-muted-foreground">{sel.result}</span>
              )}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3 border-t border-border pt-3 sm:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Stake</p>
            <p className="text-sm font-bold font-mono">${bet.stake.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total odds</p>
            <p className="text-sm font-bold font-mono">{bet.totalOdds.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Potential</p>
            <p className="text-sm font-bold font-mono text-success">${bet.potentialReturn.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Paid</p>
            <p className="text-sm font-bold font-mono">${bet.payout.toFixed(2)}</p>
          </div>
        </div>

        {bet.status === "pending" && (
          <div className="flex gap-2 pt-3 border-t border-border">
            {cashoutOffer === null ? (
              <Button variant="outline" size="sm" onClick={getCashoutOffer} disabled={cashingOut}>
                <TrendingUp className="h-4 w-4 mr-2" />
                {cashingOut ? "Calculating..." : "Get Cash-out Offer"}
              </Button>
            ) : (
              <div className="flex items-center gap-3 flex-1">
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Cash-out offer</p>
                  <p className="text-lg font-bold text-primary">${cashoutOffer.toFixed(2)}</p>
                </div>
                <Button onClick={acceptCashout} disabled={cashingOut}>
                  Accept
                </Button>
              </div>
            )}
            {canCancel && (
              <Button variant="outline" size="sm" onClick={handleCancel} disabled={cancelling}>
                <XCircle className="h-4 w-4 mr-2" />
                {cancelling ? "Cancelling..." : "Cancel"}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
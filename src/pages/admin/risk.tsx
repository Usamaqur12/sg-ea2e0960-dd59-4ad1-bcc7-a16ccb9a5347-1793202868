import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import { getExposureDashboard } from "@/services/tradingService";
import { getHighRiskUsers } from "@/services/riskService";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  AlertTriangle, TrendingUp, DollarSign, Ban, Users, Activity, Eye, RefreshCw
} from "lucide-react";
import { canAccessAdminArea } from "@/lib/adminRoles";

export default function AdminRisk() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<any>(null);
  const [highRiskUsers, setHighRiskUsers] = useState<any[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    checkAdmin();
  }, []);

  useEffect(() => {
    if (user && autoRefresh) {
      const interval = setInterval(() => {
        loadDashboard();
      }, 10000); // Refresh every 10 seconds

      return () => clearInterval(interval);
    }
  }, [user, autoRefresh]);

  async function checkAdmin() {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      router.push("/auth/login");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (!profile || !canAccessAdminArea(profile.admin_role, "risk")) {
      router.push("/");
      return;
    }

    setUser(user);
    loadDashboard();
    loadHighRiskUsers();
  }

  async function loadDashboard() {
    const result = await getExposureDashboard();
    if (result.success) {
      setDashboard(result.dashboard);
    }
    setLoading(false);
  }

  async function loadHighRiskUsers() {
    const result = await getHighRiskUsers();
    if (result.success) {
      setHighRiskUsers(result.users || []);
    }
  }

  const getRiskBadge = (level: string) => {
    switch (level) {
      case "critical":
        return <Badge className="bg-danger text-danger-foreground">Critical</Badge>;
      case "high":
        return <Badge className="bg-warning text-warning-foreground">High</Badge>;
      case "medium":
        return <Badge className="bg-primary/20 text-primary">Medium</Badge>;
      default:
        return <Badge variant="outline">Low</Badge>;
    }
  };

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold mb-1">Risk Management Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Real-time exposure and liability monitoring
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                loadDashboard();
                loadHighRiskUsers();
              }}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            
            <Button
              variant={autoRefresh ? "default" : "outline"}
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className="gap-2"
            >
              <Activity className="h-4 w-4" />
              {autoRefresh ? "Auto-Refresh ON" : "Auto-Refresh OFF"}
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 rounded-md animate-pulse bg-surface" />
            ))}
          </div>
        ) : (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card className="surface">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                    <DollarSign className="h-4 w-4" />
                    Total Turnover
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold font-mono">
                    ${dashboard?.totalTurnover?.toFixed(2) || "0.00"}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    All pending bet stakes
                  </p>
                </CardContent>
              </Card>

              <Card className="surface border-warning/30">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                    <AlertTriangle className="h-4 w-4" />
                    Open Liability
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold font-mono text-warning">
                    ${dashboard?.totalLiability?.toFixed(2) || "0.00"}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Total exposure on pending bets
                  </p>
                </CardContent>
              </Card>

              <Card className="surface border-danger/30">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                    <TrendingUp className="h-4 w-4" />
                    Max Potential Payout
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold font-mono text-danger">
                    ${dashboard?.maxPotentialPayout?.toFixed(2) || "0.00"}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Highest single bet exposure
                  </p>
                </CardContent>
              </Card>

              <Card className="surface">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                    <Ban className="h-4 w-4" />
                    Suspended Markets
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {dashboard?.suspendedMarketsCount || 0}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Currently suspended
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* High Risk Events */}
            <Card className="surface mb-6">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                  High Risk Events
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dashboard?.highRiskEvents?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No high-risk events detected
                  </div>
                ) : (
                  <div className="space-y-3">
                    {dashboard?.highRiskEvents?.map((event: any) => (
                      <div
                        key={event.id}
                        className="p-4 rounded-md border border-border hover:border-warning/50 transition-smooth"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-semibold">
                                {event.events?.home_team} vs {event.events?.away_team}
                              </span>
                              {getRiskBadge(event.risk_level)}
                            </div>
                            
                            <div className="text-sm text-muted-foreground mb-2">
                              {event.events?.leagues?.name || "Unassigned league"}
                            </div>

                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div>
                                <span className="text-muted-foreground">Total Liability:</span>
                                <span className="font-mono font-semibold ml-2">
                                  ${event.total_liability?.toFixed(2)}
                                </span>
                              </div>
                              
                              <div>
                                <span className="text-muted-foreground">Total Bets:</span>
                                <span className="font-semibold ml-2">{event.bet_count}</span>
                              </div>
                              
                              <div>
                                <span className="text-muted-foreground">Max Single:</span>
                                <span className="font-mono font-semibold ml-2">
                                  ${event.max_potential_payout?.toFixed(2)}
                                </span>
                              </div>
                            </div>
                          </div>

                          <Button variant="outline" size="sm" className="gap-1 flex-shrink-0" onClick={() => void router.push(`/admin/trading?event=${encodeURIComponent(event.event_id)}`)}>
                            <Eye className="h-3.5 w-3.5" />
                            View
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* High Risk Users */}
            <Card className="surface">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5 text-warning" />
                  High Risk Users
                </CardTitle>
              </CardHeader>
              <CardContent>
                {highRiskUsers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No high-risk users detected
                  </div>
                ) : (
                  <div className="space-y-3">
                    {highRiskUsers.map((user) => (
                      <div
                        key={user.user_id}
                        className="p-4 rounded-md border border-border hover:border-primary/30 transition-smooth"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-semibold">{user.profiles?.email || "Unknown User"}</span>
                              {getRiskBadge(user.risk_level)}
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="text-muted-foreground">Total Bets:</span>
                                <span className="font-semibold ml-2">{user.total_bets}</span>
                              </div>
                              
                              <div>
                                <span className="text-muted-foreground">Win Rate:</span>
                                <span className="font-semibold ml-2">{user.win_rate?.toFixed(1)}%</span>
                              </div>
                              
                              <div>
                                <span className="text-muted-foreground">Avg Stake:</span>
                                <span className="font-mono font-semibold ml-2">
                                  ${user.avg_stake?.toFixed(2)}
                                </span>
                              </div>
                              
                              <div>
                                <span className="text-muted-foreground">Total Won:</span>
                                <span className="font-mono font-semibold ml-2 text-success">
                                  ${user.total_won?.toFixed(2)}
                                </span>
                              </div>
                            </div>

                            {user.flags && user.flags.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {user.flags.map((flag: string, idx: number) => (
                                  <Badge key={idx} variant="outline" className="text-xs">
                                    {flag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>

                          <Button variant="outline" size="sm" className="gap-1 flex-shrink-0" onClick={() => void router.push(`/admin/users?user=${encodeURIComponent(user.user_id)}`)}>
                            <Eye className="h-3.5 w-3.5" />
                            Review
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AdminLayout>
  );
}

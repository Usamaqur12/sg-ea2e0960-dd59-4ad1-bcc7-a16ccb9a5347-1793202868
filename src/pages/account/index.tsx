import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import { getUserBets } from "@/services/bettingService";
import { getUserTransactions } from "@/services/walletService";
import { getNotifications } from "@/services/notificationsService";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  User, Wallet, Receipt, Settings, TrendingUp, 
  ArrowRight, ChevronRight, Shield, Bell, LogOut, Star, Gift, Trophy,
  X, AlertTriangle, Info, CheckCircle, Megaphone
} from "lucide-react";
import Link from "next/link";

interface Announcement {
  id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "success" | "urgent";
  priority: number;
}

export default function Account() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissedAnnouncements, setDismissedAnnouncements] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState({
    totalBets: 0,
    activeBets: 0,
    wonBets: 0,
    totalWinnings: 0,
  });
  const [loading, setLoading] = useState(true);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      router.push("/auth/login");
      return;
    }

    setUser(user);

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profile) {
      setProfile(profile);
      loadStats(user.id);
      loadAnnouncements(user.id);
      void loadNotificationCount();
    }
  }

  async function loadNotificationCount() {
    const result = await getNotifications(100);
    setUnreadNotifications(result.notifications.filter((notification) => !notification.is_read).length);
  }

  async function loadAnnouncements(userId: string) {
    const now = new Date().toISOString();

    // Get active announcements within date range
    const { data } = await supabase
      .from("announcements")
      .select("id, title, message, type, priority")
      .eq("is_active", true)
      .lte("starts_at", now)
      .or(`expires_at.is.null,expires_at.gte.${now}`)
      .order("priority", { ascending: false });

    if (data) {
      // Get dismissed announcements for this user
      const { data: dismissed } = await supabase
        .from("user_announcement_dismissals")
        .select("announcement_id")
        .eq("user_id", userId);

      const dismissedSet = new Set(dismissed?.map(d => d.announcement_id) || []);
      setDismissedAnnouncements(dismissedSet);

      // Filter out dismissed announcements and cast types
      const visibleAnnouncements = data
        .filter(a => !dismissedSet.has(a.id))
        .map(a => ({
          id: a.id,
          title: a.title,
          message: a.message,
          type: a.type as "info" | "warning" | "success" | "urgent",
          priority: a.priority,
        }));

      setAnnouncements(visibleAnnouncements);
    }
  }

  async function dismissAnnouncement(announcementId: string) {
    if (!user) return;

    // Save dismissal to database
    await supabase
      .from("user_announcement_dismissals")
      .insert({
        user_id: user.id,
        announcement_id: announcementId,
      });

    // Update local state
    setDismissedAnnouncements(prev => new Set([...prev, announcementId]));
    setAnnouncements(prev => prev.filter(a => a.id !== announcementId));
  }

  async function loadStats(userId: string) {
    setLoading(true);

    // Get bet statistics
    const { data: bets } = await supabase
      .from("bets")
      .select("*")
      .eq("user_id", userId);

    if (bets) {
      const totalBets = bets.length;
      const activeBets = bets.filter(b => b.status === "pending").length;
      const wonBets = bets.filter(b => b.status === "won").length;
      const totalWinnings = bets
        .filter(b => b.status === "won")
        .reduce((sum, b) => sum + (b.payout || 0), 0);

      setStats({ totalBets, activeBets, wonBets, totalWinnings });
    }

    setLoading(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  const getKYCBadge = () => {
    if (!profile) return null;
    
    switch (profile.kyc_status) {
      case "approved":
        return <Badge className="bg-success/10 text-success border-success/30">Verified</Badge>;
      case "pending":
        return <Badge variant="outline" className="badge-featured">Pending</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">Not Submitted</Badge>;
    }
  };

  const getAnnouncementVariant = (type: string) => {
    switch (type) {
      case "urgent":
        return "destructive";
      case "warning":
        return "default";
      case "success":
        return "default";
      default:
        return "default";
    }
  };

  const getAnnouncementIcon = (type: string) => {
    switch (type) {
      case "urgent":
        return <AlertTriangle className="h-5 w-5" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5" />;
      case "success":
        return <CheckCircle className="h-5 w-5" />;
      default:
        return <Info className="h-5 w-5" />;
    }
  };

  const getAnnouncementClass = (type: string) => {
    switch (type) {
      case "urgent":
        return "border-danger bg-danger/5";
      case "warning":
        return "border-warning bg-warning/5";
      case "success":
        return "border-success bg-success/5";
      default:
        return "border-primary bg-primary/5";
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background pb-14 lg:pb-0">
      <Header
        user={
          profile
            ? {
                email: user?.email || "",
                balance: profile.demo_balance || 0,
              }
            : null
        }
        onAuthClick={() => router.push("/auth/login")}
      />

      <main className="flex-1 container py-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold mb-1">My Account</h1>
            <p className="text-sm text-muted-foreground">
              Manage your account, betting history, and preferences
            </p>
          </div>

          {/* Global Announcements */}
          {announcements.length > 0 && (
            <div className="space-y-3 mb-6">
              {announcements.map((announcement) => (
                <Alert
                  key={announcement.id}
                  variant={getAnnouncementVariant(announcement.type)}
                  className={getAnnouncementClass(announcement.type)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      {getAnnouncementIcon(announcement.type)}
                      <div className="flex-1">
                        <AlertTitle className="mb-1 text-sm font-bold">
                          {announcement.title}
                        </AlertTitle>
                        <AlertDescription className="text-sm">
                          {announcement.message}
                        </AlertDescription>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 flex-shrink-0"
                      onClick={() => dismissAnnouncement(announcement.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </Alert>
              ))}
            </div>
          )}

          {/* Profile Overview */}
          <Card className="surface-elevated mb-6">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <div className="text-lg font-bold mb-1">{user?.email}</div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">KYC Status:</span>
                      {getKYCBadge()}
                    </div>
                  </div>
                </div>
                <Button variant="outline" onClick={handleLogout} className="gap-2">
                  <LogOut className="h-4 w-4" />
                  Logout
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <Card className="surface">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Receipt className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{stats.totalBets}</div>
                    <div className="text-xs text-muted-foreground">Total Bets</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="surface">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-warning" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{stats.activeBets}</div>
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
                    <div className="text-2xl font-bold">{stats.wonBets}</div>
                    <div className="text-xs text-muted-foreground">Wins</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="surface">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center">
                    <Wallet className="h-5 w-5 text-gold" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold font-mono">${stats.totalWinnings.toFixed(0)}</div>
                    <div className="text-xs text-muted-foreground">Winnings</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <Link href="/account/wallet">
              <Card className="surface hover:border-primary/30 transition-smooth cursor-pointer h-full">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Wallet className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-semibold mb-0.5">Wallet</div>
                        <div className="text-xs text-muted-foreground">Manage balance</div>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/account/bets">
              <Card className="surface hover:border-primary/30 transition-smooth cursor-pointer h-full">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center">
                        <Receipt className="h-5 w-5 text-warning" />
                      </div>
                      <div>
                        <div className="font-semibold mb-0.5">My Bets</div>
                        <div className="text-xs text-muted-foreground">View history</div>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/account/settings">
              <Card className="surface hover:border-primary/30 transition-smooth cursor-pointer h-full">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-muted/10 flex items-center justify-center">
                        <Settings className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="font-semibold mb-0.5">Settings</div>
                        <div className="text-xs text-muted-foreground">Account & KYC</div>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/rewards">
              <Card className="surface hover:border-primary/30 transition-smooth cursor-pointer h-full">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center">
                        <Star className="h-5 w-5 text-gold" />
                      </div>
                      <div>
                        <div className="font-semibold mb-0.5">Rewards</div>
                        <div className="text-xs text-muted-foreground">Missions & leaderboard</div>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/promotions">
              <Card className="surface hover:border-primary/30 transition-smooth cursor-pointer h-full">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                        <Gift className="h-5 w-5 text-success" />
                      </div>
                      <div>
                        <div className="font-semibold mb-0.5">Bonuses</div>
                        <div className="text-xs text-muted-foreground">View offers</div>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/account/notifications">
              <Card className="surface hover:border-primary/30 transition-smooth cursor-pointer h-full">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Bell className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-semibold mb-0.5">Notifications</div>
                        <div className="text-xs text-muted-foreground">
                          {unreadNotifications > 0 ? `${unreadNotifications} unread` : "All caught up"}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </main>

      <Footer />
      <MobileBottomNav />
    </div>
  );
}

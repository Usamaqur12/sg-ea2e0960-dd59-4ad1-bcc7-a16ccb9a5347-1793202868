import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  LayoutDashboard, Users, Receipt, CreditCard, Gift, 
  MessageSquare, AlertTriangle, BarChart3, Shield,
  FileText, TrendingUp, Megaphone, Building2, Gamepad2,
  Settings, LogOut, Bitcoin, LineChart
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [adminRole, setAdminRole] = useState<string>("admin");
  const { toast } = useToast();

  useEffect(() => {
    async function checkAuth() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          router.push("/admin/login");
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("is_admin, admin_role, is_suspended")
          .eq("id", user.id)
          .maybeSingle();

        if (!profile?.is_admin || profile.is_suspended) {
          toast({ title: "Access denied", description: "Admin privileges required", variant: "destructive" });
          router.push("/admin/login");
          return;
        }

        // 2FA requirement removed per user request
        setAdminRole(profile.admin_role || "admin");
        setLoading(false);
      } catch (error) {
        console.error("Auth check failed:", error);
        router.push("/admin/login");
      }
    }

    checkAuth();
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/admin/login");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const navigation = [
    { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { name: "Users", href: "/admin/users", icon: Users },
    { name: "KYC", href: "/admin/kyc", icon: Shield },
    { name: "Bets", href: "/admin/bets", icon: Receipt },
    { name: "Sports", href: "/admin/sports", icon: LineChart },
    { name: "Transactions", href: "/admin/transactions", icon: CreditCard },
    { name: "Payments", href: "/admin/payments", icon: CreditCard },
    { name: "Crypto", href: "/admin/crypto", icon: Bitcoin },
    { name: "Promotions", href: "/admin/promotions", icon: Gift },
    { name: "Support", href: "/admin/support", icon: MessageSquare },
    { name: "Risk", href: "/admin/risk", icon: AlertTriangle },
    { name: "Reports", href: "/admin/reports", icon: BarChart3 },
    { name: "Audit", href: "/admin/audit", icon: FileText },
    { name: "Monitoring", href: "/admin/monitoring", icon: TrendingUp },
    { name: "Trading", href: "/admin/trading", icon: TrendingUp },
    { name: "Announcements", href: "/admin/announcements", icon: Megaphone },
    { name: "Brokers", href: "/admin/brokers", icon: Building2 },
    { name: "Casino", href: "/admin/casino", icon: Gamepad2 },
    { name: "Providers", href: "/admin/providers", icon: Settings },
    { name: "Readiness", href: "/admin/readiness", icon: Shield },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 bg-card border-r border-border">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-border">
            <Link href="/admin" className="text-2xl font-bold text-primary">
              PrimeBet Admin
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = router.pathname === item.href;
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* User info & logout */}
          <div className="p-4 border-t border-border">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm">
                <div className="font-medium text-foreground">Admin</div>
                <div className="text-xs text-muted-foreground capitalize">{adminRole}</div>
              </div>
            </div>
            <Button
              onClick={handleLogout}
              variant="outline"
              size="sm"
              className="w-full"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="ml-64 p-8">
        {children}
      </div>
    </div>
  );
}
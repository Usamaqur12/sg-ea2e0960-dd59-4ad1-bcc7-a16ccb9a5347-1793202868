import { useState, useEffect, ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import { 
  LayoutDashboard, Users, FileCheck, TrendingUp, Trophy, Wallet, 
  Gift, Headphones, FileText, ChevronLeft, ChevronRight,
  LogOut, Shield, AlertTriangle, Activity, SlidersHorizontal, Megaphone, Handshake,
  Menu, X, Bitcoin, CreditCard, Radio, Wrench, Rocket, Dices
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { canAccessAdminArea, isAdminRole, type AdminArea } from "@/lib/adminRoles";
import { DEMO_BACKEND_ENABLED } from "@/integrations/supabase/demoClient";

interface AdminLayoutProps {
  children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userRole, setUserRole] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  async function checkAdminAccess() {
    try {
      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push("/admin/login");
        return;
      }

      // Check if user has admin role and is not suspended
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("admin_role, full_name, is_suspended, suspension_reason")
        .eq("id", user.id)
        .single();

      if (error || !profile) {
        await supabase.auth.signOut();
        router.push("/admin/login");
        return;
      }

      // Block suspended users
      if (profile.is_suspended) {
        await supabase.auth.signOut();
        toast({
          title: "Account Suspended",
          description: profile.suspension_reason || "Your account has been suspended. Please contact support.",
          variant: "destructive",
        });
        router.push("/admin/login");
        return;
      }

      // Verify admin role
      if (!isAdminRole(profile.admin_role)) {
        await supabase.auth.signOut();
        router.push("/");
        return;
      }

      const assurance = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (assurance.error || assurance.data.currentLevel !== "aal2") {
        toast({ title: "Two-factor verification required", description: "Verify your authenticator code to access the admin portal.", variant: "destructive" });
        router.push("/admin/login");
        return;
      }

      setUser(user);
      setUserRole(profile.admin_role);
      setLoading(false);
    } catch (error) {
      console.error("Admin access check error:", error);
      router.push("/admin/login");
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/admin/login");
  }

  const menuItems: Array<{ icon: typeof LayoutDashboard; label: string; href: string; area: AdminArea }> = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/admin", area: "dashboard" },
    { icon: Users, label: "Users", href: "/admin/users", area: "users" },
    { icon: FileCheck, label: "KYC Approvals", href: "/admin/kyc", area: "kyc" },
    { icon: TrendingUp, label: "Bets", href: "/admin/bets", area: "bets" },
    { icon: Trophy, label: "Sports & Events", href: "/admin/sports", area: "sports" },
    { icon: Radio, label: "Live Score Providers", href: "/admin/providers", area: "sports" },
    { icon: SlidersHorizontal, label: "Trading Control", href: "/admin/trading", area: "trading" },
    { icon: Wallet, label: "Transactions", href: "/admin/transactions", area: "transactions" },
    { icon: CreditCard, label: "Payment Methods", href: "/admin/payments", area: "payments" },
    { icon: Bitcoin, label: "Crypto Reconciliation", href: "/admin/crypto", area: "crypto" },
    { icon: Handshake, label: "Brokers & Agents", href: "/admin/brokers", area: "brokers" },
    { icon: Dices, label: "Casino Catalogue", href: "/admin/casino", area: "casino" },
    { icon: Gift, label: "Promotions", href: "/admin/promotions", area: "promotions" },
    { icon: Headphones, label: "Support Tickets", href: "/admin/support", area: "support" },
    { icon: Shield, label: "Risk Management", href: "/admin/risk", area: "risk" },
    { icon: Activity, label: "Monitoring", href: "/admin/monitoring", area: "monitoring" },
    { icon: Rocket, label: "Launch Readiness", href: "/admin/readiness", area: "monitoring" },
    { icon: Megaphone, label: "Announcements", href: "/admin/announcements", area: "announcements" },
    { icon: FileText, label: "Reports", href: "/admin/reports", area: "reports" },
    { icon: AlertTriangle, label: "Audit Logs", href: "/admin/audit", area: "audit" },
    { icon: Wrench, label: "Feature Controls", href: "/admin/features", area: "audit" },
  ];

  const visibleItems = menuItems.filter(item => canAccessAdminArea(userRole, item.area));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Shield className="h-12 w-12 text-primary mx-auto mb-3 animate-pulse" />
          <p className="text-sm text-muted-foreground">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background">
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close admin navigation"
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 border-r border-border bg-surface flex flex-col transition-all duration-300 lg:static lg:z-auto",
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        collapsed ? "w-64 lg:w-16" : "w-64"
      )}>
        {/* Header */}
        <div className="h-16 border-b border-border flex items-center justify-between px-4">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                <span className="text-sm font-bold text-white">PB</span>
              </div>
              <span className="font-bold">Admin Panel</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="ml-auto hidden lg:inline-flex"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="ml-auto lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close navigation">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive = router.pathname === item.href;
            
            return (
              <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}>
                <div className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                  isActive 
                    ? "bg-primary text-primary-foreground" 
                    : "hover:bg-background text-muted-foreground hover:text-foreground",
                  collapsed && "justify-center"
                )}>
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* User Info */}
        <div className="border-t border-border p-3">
          <div className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-lg bg-background",
            collapsed && "justify-center"
          )}>
            <Shield className="h-5 w-5 text-gold flex-shrink-0" />
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate capitalize">{userRole.replace(/_/g, " ")}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
            )}
          </div>
          
          <Button
            variant="ghost"
            className={cn(
              "w-full mt-2 justify-start gap-3 text-danger hover:text-danger hover:bg-danger/10",
              collapsed && "justify-center px-0"
            )}
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5" />
            {!collapsed && <span>Logout</span>}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen overflow-auto">
        <div className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-surface/95 px-4 backdrop-blur lg:hidden">
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)} aria-label="Open admin navigation">
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2 font-bold"><span className="flex h-7 w-7 items-center justify-center rounded bg-primary text-xs text-primary-foreground">PB</span> Admin</div>
          <span className="ml-auto text-xs capitalize text-muted-foreground">{userRole.replace(/_/g, " ")}</span>
        </div>
        {DEMO_BACKEND_ENABLED && (
          <div className="border-b border-warning/30 bg-warning/10 px-4 py-2 text-center text-xs font-medium text-warning">
            Demo admin environment — browser-local data only; no real money or production actions.
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

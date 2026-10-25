import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  ArrowUpRight, ArrowDownLeft, Receipt, Search, Calendar,
  DollarSign, CircleCheck, TriangleAlert
} from "lucide-react";
import { canAccessAdminArea } from "@/lib/adminRoles";

type ReconciliationMismatch = {
  user_id: string;
  profile_balance: number;
  ledger_available: number;
  difference: number;
};

export default function AdminTransactions() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [reconciliation, setReconciliation] = useState<ReconciliationMismatch[]>([]);
  const [reconciliationError, setReconciliationError] = useState<string | null>(null);
  const [reconciliationLoading, setReconciliationLoading] = useState(true);

  useEffect(() => {
    checkAdmin();
  }, []);

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

    if (!profile || !canAccessAdminArea(profile.admin_role, "transactions")) {
      router.push("/");
      return;
    }

    setUser(user);
    await Promise.all([loadTransactions(), loadReconciliation()]);
  }

  async function loadReconciliation() {
    setReconciliationLoading(true);
    const { data, error } = await supabase.rpc("get_wallet_reconciliation_report");

    if (error) {
      setReconciliationError(error.message);
      setReconciliationLoading(false);
      return;
    }

    setReconciliation((data ?? []) as ReconciliationMismatch[]);
    setReconciliationError(null);
    setReconciliationLoading(false);
  }

  async function loadTransactions() {
    setLoading(true);

    const { data, error } = await supabase
      .from("wallet_transactions")
      .select(`
        *,
        profiles!wallet_transactions_user_id_fkey (
          id,
          email,
          full_name
        )
      `)
      .order("created_at", { ascending: false })
      .limit(100);

    if (data) {
      setTransactions(data);
    }

    setLoading(false);
  }

  const filteredTransactions = transactions.filter((tx) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      tx.profiles?.email?.toLowerCase().includes(query) ||
      tx.profiles?.full_name?.toLowerCase().includes(query) ||
      tx.description?.toLowerCase().includes(query)
    );
  });

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "deposit":
      case "bet_won":
        return <ArrowDownLeft className="h-4 w-4 text-success" />;
      case "withdrawal":
      case "bet_stake":
        return <ArrowUpRight className="h-4 w-4 text-danger" />;
      default:
        return <Receipt className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTypeBadge = (type: string) => {
    const typeMap: Record<string, { label: string; variant: string }> = {
      deposit: { label: "Deposit", variant: "success" },
      withdrawal: { label: "Withdrawal", variant: "warning" },
      bet_stake: { label: "Bet Stake", variant: "secondary" },
      bet_won: { label: "Bet Won", variant: "success" },
      bet_lost: { label: "Bet Lost", variant: "destructive" },
      bet_void: { label: "Bet Void", variant: "outline" },
    };

    const config = typeMap[type] || { label: type, variant: "outline" };
    return (
      <Badge variant={config.variant as any} className="text-xs">
        {config.label}
      </Badge>
    );
  };

  const totalDeposits = transactions
    .filter(tx => tx.type === "deposit")
    .reduce((sum, tx) => sum + tx.amount, 0);

  const totalWithdrawals = transactions
    .filter(tx => tx.type === "withdrawal")
    .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

  const totalBetStakes = transactions
    .filter(tx => tx.type === "bet_stake")
    .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

  const totalPayouts = transactions
    .filter(tx => tx.type === "bet_won")
    .reduce((sum, tx) => sum + tx.amount, 0);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Wallet Transactions</h1>
          <p className="text-sm text-muted-foreground">
            View all wallet transactions across the platform
          </p>
        </div>

        <Card className="surface">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              {!reconciliationLoading && reconciliation.length === 0 && !reconciliationError ? (
                <CircleCheck className="h-5 w-5 text-success" />
              ) : (
                <TriangleAlert className="h-5 w-5 text-warning" />
              )}
              Wallet Reconciliation
            </CardTitle>
          </CardHeader>
          <CardContent>
            {reconciliationLoading ? (
              <p className="text-sm text-muted-foreground">Checking ledger balances...</p>
            ) : reconciliationError ? (
              <p className="text-sm text-muted-foreground">
                Reconciliation report is available to finance-authorized staff only.
              </p>
            ) : reconciliation.length === 0 ? (
              <p className="text-sm text-success">
                All profile balances match the cash and bonus ledger.
              </p>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-warning">
                  {reconciliation.length} balance mismatch{reconciliation.length === 1 ? "" : "es"} require review.
                </p>
                {reconciliation.slice(0, 10).map((row) => (
                  <div key={row.user_id} className="grid grid-cols-2 gap-2 rounded border border-warning/30 p-3 text-xs md:grid-cols-4">
                    <span className="truncate font-mono">{row.user_id}</span>
                    <span>Profile: ${Number(row.profile_balance).toFixed(2)}</span>
                    <span>Ledger: ${Number(row.ledger_available).toFixed(2)}</span>
                    <span className="font-semibold text-warning">Difference: ${Number(row.difference).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="surface">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                  <ArrowDownLeft className="h-5 w-5 text-success" />
                </div>
                <div>
                  <div className="text-xl font-bold">${totalDeposits.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">Total Deposits</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="surface">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center">
                  <ArrowUpRight className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <div className="text-xl font-bold">${totalWithdrawals.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">Total Withdrawals</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="surface">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="text-xl font-bold">${totalBetStakes.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">Total Stakes</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="surface">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                  <Receipt className="h-5 w-5 text-success" />
                </div>
                <div>
                  <div className="text-xl font-bold">${totalPayouts.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">Total Payouts</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Transactions List */}
        <Card className="surface">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>All Transactions</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search by user or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-9 text-xs"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading transactions...
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No transactions found
              </div>
            ) : (
              <div className="space-y-2">
                {filteredTransactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between p-3 rounded border border-border hover:border-primary/30 transition-smooth">
                    <div className="flex items-center gap-3 flex-1">
                      {getTransactionIcon(tx.type)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm truncate">
                            {tx.profiles?.full_name || tx.profiles?.email || "Unknown User"}
                          </span>
                          {getTypeBadge(tx.type)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {tx.description}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(tx.created_at).toLocaleDateString()}
                      </div>
                      <div className={`text-sm font-mono font-bold ${tx.amount >= 0 ? 'text-success' : 'text-danger'}`}>
                        {tx.amount >= 0 ? '+' : ''}{tx.amount >= 0 ? '$' : '-$'}{Math.abs(tx.amount).toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

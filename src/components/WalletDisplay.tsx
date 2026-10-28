import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Wallet, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface WalletBalance {
  balance: number;
  currency: string;
  last_transaction_at: string | null;
}

interface WalletDisplayProps {
  userId?: string;
  compact?: boolean;
  showDetails?: boolean;
}

export function WalletDisplay({ userId, compact = false, showDetails = true }: WalletDisplayProps) {
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentChange, setRecentChange] = useState<number>(0);
  const { toast } = useToast();

  useEffect(() => {
    loadWalletBalance();

    // Subscribe to real-time balance updates
    const channel = supabase
      .channel("wallet-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "wallet_transactions",
          filter: userId ? `user_id=eq.${userId}` : undefined,
        },
        () => {
          loadWalletBalance();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  async function loadWalletBalance() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const targetUserId = userId || user?.id;

      if (!targetUserId) {
        setLoading(false);
        return;
      }

      // Get wallet account
      const { data: wallet, error } = await supabase
        .from("wallet_accounts")
        .select("balance, currency, last_transaction_at")
        .eq("user_id", targetUserId)
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (wallet) {
        setBalance(wallet);

        // Calculate recent change (last 24 hours)
        const { data: recentTxs } = await supabase
          .from("wallet_transactions")
          .select("amount")
          .eq("user_id", targetUserId)
          .eq("status", "completed")
          .gte("created_at", new Date(Date.now() - 86400000).toISOString());

        if (recentTxs && recentTxs.length > 0) {
          const change = recentTxs.reduce((sum, tx) => sum + tx.amount, 0);
          setRecentChange(change);
        }
      }
    } catch (error: any) {
      console.error("Failed to load wallet balance:", error);
      toast({
        title: "Error loading wallet",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <Card className={compact ? "border-0 shadow-none" : ""}>
        <CardContent className={compact ? "p-3" : "p-6"}>
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-32" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!balance) {
    return (
      <Card className={compact ? "border-0 shadow-none" : ""}>
        <CardContent className={compact ? "p-3" : "p-6"}>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Wallet className="h-4 w-4" />
            <span className="text-sm">No wallet found</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const availableBalance = balance.balance;
  const totalBalance = balance.balance;

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Wallet className="h-4 w-4 text-muted-foreground" />
        <div className="flex flex-col">
          <span className="text-sm font-semibold">
            ${availableBalance.toFixed(2)}
          </span>
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Main Balance */}
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <DollarSign className="h-4 w-4" />
              <span>Available Balance</span>
            </div>
            <div className="text-3xl font-bold">
              ${availableBalance.toFixed(2)}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              {balance.currency}
            </div>
          </div>

          {/* 24h Change */}
          {recentChange !== 0 && (
            <div className="flex items-center gap-2 text-sm">
              {recentChange > 0 ? (
                <>
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span className="text-green-600 dark:text-green-400">
                    +${Math.abs(recentChange).toFixed(2)} (24h)
                  </span>
                </>
              ) : (
                <>
                  <TrendingDown className="h-4 w-4 text-red-500" />
                  <span className="text-red-600 dark:text-red-400">
                    -${Math.abs(recentChange).toFixed(2)} (24h)
                  </span>
                </>
              )}
            </div>
          )}

          {/* Additional Details */}
          {showDetails && balance.last_transaction_at && (
            <div className="space-y-2 pt-4 border-t">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Last transaction:</span>
                <span>{new Date(balance.last_transaction_at).toLocaleDateString()}</span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
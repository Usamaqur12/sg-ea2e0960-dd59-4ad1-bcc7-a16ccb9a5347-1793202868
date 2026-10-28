import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Clock, CheckCircle, XCircle, AlertCircle, DollarSign, ArrowUpCircle, ArrowDownCircle } from "lucide-react";

interface Transaction {
  id: string;
  user_id: string;
  user_email: string;
  type: string;
  amount: number;
  status: string;
  payment_method: string | null;
  created_at: string;
  processed_at: string | null;
  notes: string | null;
}

export default function AdminTransactions() {
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [action, setAction] = useState<"approve" | "reject" | null>(null);
  const [notes, setNotes] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    void loadTransactions();
  }, []);

  async function loadTransactions() {
    try {
      const { data: txs } = await supabase
        .from("wallet_transactions")
        .select("id, user_id, type, amount, status, payment_method, created_at, processed_at, notes")
        .order("created_at", { ascending: false })
        .limit(100);

      if (txs) {
        // Get user emails
        const userIds = [...new Set(txs.map(t => t.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, email")
          .in("id", userIds);

        const emailMap = new Map(profiles?.map(p => [p.id, p.email]) || []);

        setTransactions(
          txs.map(tx => ({
            ...tx,
            user_email: emailMap.get(tx.user_id) || "Unknown",
          }))
        );
      }
    } catch (error: any) {
      toast({
        title: "Error loading transactions",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function processTransaction(approve: boolean) {
    if (!selectedTx) return;

    setProcessing(true);
    try {
      if (approve) {
        // Approve: update status and credit wallet
        const { error: txError } = await supabase
          .from("wallet_transactions")
          .update({
            status: "completed",
            processed_at: new Date().toISOString(),
            notes: notes || null,
          })
          .eq("id", selectedTx.id);

        if (txError) throw txError;

        // Update wallet balance for deposits
        if (selectedTx.type === "deposit") {
          const { data: wallet } = await supabase
            .from("wallet_accounts")
            .select("balance")
            .eq("user_id", selectedTx.user_id)
            .single();

          if (wallet) {
            await supabase
              .from("wallet_accounts")
              .update({ balance: Number(wallet.balance) + selectedTx.amount })
              .eq("user_id", selectedTx.user_id);
          }
        }

        // Send notification
        await supabase.from("user_notifications").insert({
          user_id: selectedTx.user_id,
          type: "transaction",
          title: "Transaction Approved",
          message: `Your ${selectedTx.type} of $${selectedTx.amount.toFixed(2)} has been approved`,
        });

        toast({
          title: "Transaction approved",
          description: "Funds have been credited to the user's wallet",
        });
      } else {
        // Reject: update status only
        const { error } = await supabase
          .from("wallet_transactions")
          .update({
            status: "failed",
            processed_at: new Date().toISOString(),
            notes: notes || "Rejected by admin",
          })
          .eq("id", selectedTx.id);

        if (error) throw error;

        // Send notification
        await supabase.from("user_notifications").insert({
          user_id: selectedTx.user_id,
          type: "transaction",
          title: "Transaction Rejected",
          message: `Your ${selectedTx.type} of $${selectedTx.amount.toFixed(2)} was rejected. ${notes}`,
        });

        toast({
          title: "Transaction rejected",
          description: "User has been notified",
        });
      }

      await loadTransactions();
      setSelectedTx(null);
      setAction(null);
      setNotes("");
    } catch (error: any) {
      toast({
        title: "Error processing transaction",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  }

  const pending = transactions.filter(t => t.status === "pending");
  const completed = transactions.filter(t => t.status === "completed");
  const failed = transactions.filter(t => t.status === "failed");

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="border-warning text-warning">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case "completed":
        return (
          <Badge className="bg-success/10 text-success border-success/30">
            <CheckCircle className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeIcon = (type: string) => {
    return type === "deposit" ? (
      <ArrowDownCircle className="h-4 w-4 text-success" />
    ) : (
      <ArrowUpCircle className="h-4 w-4 text-warning" />
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Transaction Management</h1>
          <p className="text-sm text-muted-foreground">Review and approve pending deposits and withdrawals</p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="surface">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{pending.length}</div>
                  <div className="text-xs text-muted-foreground">Pending</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="surface">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-success" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{completed.length}</div>
                  <div className="text-xs text-muted-foreground">Completed</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="surface">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-danger/10 flex items-center justify-center">
                  <XCircle className="h-5 w-5 text-danger" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{failed.length}</div>
                  <div className="text-xs text-muted-foreground">Failed</div>
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
                  <div className="text-2xl font-bold font-mono">
                    ${pending.reduce((sum, t) => sum + t.amount, 0).toFixed(0)}
                  </div>
                  <div className="text-xs text-muted-foreground">Pending Value</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Transactions */}
        <Card className="surface">
          <CardHeader>
            <CardTitle>Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="pending">
              <TabsList className="mb-4">
                <TabsTrigger value="pending">
                  Pending ({pending.length})
                </TabsTrigger>
                <TabsTrigger value="completed">
                  Completed ({completed.length})
                </TabsTrigger>
                <TabsTrigger value="failed">
                  Failed ({failed.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="pending" className="space-y-3">
                {loading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
                    ))}
                  </div>
                ) : pending.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-8">
                    No pending transactions
                  </p>
                ) : (
                  pending.map((tx) => (
                    <TransactionCard
                      key={tx.id}
                      transaction={tx}
                      onAction={(action) => {
                        setSelectedTx(tx);
                        setAction(action);
                      }}
                    />
                  ))
                )}
              </TabsContent>

              <TabsContent value="completed" className="space-y-3">
                {completed.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-8">
                    No completed transactions
                  </p>
                ) : (
                  completed.slice(0, 20).map((tx) => (
                    <TransactionCard key={tx.id} transaction={tx} />
                  ))
                )}
              </TabsContent>

              <TabsContent value="failed" className="space-y-3">
                {failed.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-8">
                    No failed transactions
                  </p>
                ) : (
                  failed.slice(0, 20).map((tx) => (
                    <TransactionCard key={tx.id} transaction={tx} />
                  ))
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Approval/Rejection Dialog */}
      <Dialog open={action !== null} onOpenChange={() => { setAction(null); setSelectedTx(null); setNotes(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {action === "approve" ? "Approve Transaction" : "Reject Transaction"}
            </DialogTitle>
            <DialogDescription>
              {selectedTx && (
                <div className="space-y-2 mt-4 text-sm">
                  <div><strong>User:</strong> {selectedTx.user_email}</div>
                  <div><strong>Type:</strong> {selectedTx.type}</div>
                  <div><strong>Amount:</strong> ${selectedTx.amount.toFixed(2)}</div>
                  <div><strong>Method:</strong> {selectedTx.payment_method || "N/A"}</div>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Notes (optional)</label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={action === "reject" ? "Reason for rejection..." : "Admin notes..."}
                rows={3}
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setAction(null); setSelectedTx(null); setNotes(""); }}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button
              variant={action === "approve" ? "default" : "destructive"}
              onClick={() => processTransaction(action === "approve")}
              disabled={processing}
            >
              {processing ? "Processing..." : action === "approve" ? "Approve" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

function TransactionCard({
  transaction,
  onAction,
}: {
  transaction: Transaction;
  onAction?: (action: "approve" | "reject") => void;
}) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="border-warning text-warning">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case "completed":
        return (
          <Badge className="bg-success/10 text-success border-success/30">
            <CheckCircle className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeIcon = (type: string) => {
    return type === "deposit" ? (
      <ArrowDownCircle className="h-4 w-4 text-success" />
    ) : (
      <ArrowUpCircle className="h-4 w-4 text-warning" />
    );
  };

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-lg border border-border gap-4">
      <div className="flex items-center gap-4 flex-1">
        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
          {getTypeIcon(transaction.type)}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <span className="font-medium capitalize">{transaction.type}</span>
            {getStatusBadge(transaction.status)}
          </div>
          <div className="text-sm text-muted-foreground space-y-0.5">
            <div>{transaction.user_email}</div>
            <div>
              {new Date(transaction.created_at).toLocaleString()}
              {transaction.payment_method && ` · ${transaction.payment_method}`}
            </div>
            {transaction.notes && (
              <div className="text-xs italic">{transaction.notes}</div>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <div className="text-lg font-bold font-mono">
            ${transaction.amount.toFixed(2)}
          </div>
        </div>
        {transaction.status === "pending" && onAction && (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="text-success border-success/30"
              onClick={() => onAction("approve")}
            >
              Approve
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => onAction("reject")}
            >
              Reject
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
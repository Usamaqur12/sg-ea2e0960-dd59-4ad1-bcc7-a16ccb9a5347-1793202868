import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Search, Shield, Ban, CheckCircle, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/router";

interface User {
  id: string;
  email: string;
  full_name: string;
  demo_balance: number;
  kyc_status: string;
  is_suspended: boolean;
  suspension_reason: string | null;
  created_at: string;
}

export default function AdminUsers() {
  const { toast } = useToast();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [unsuspendDialogOpen, setUnsuspendDialogOpen] = useState(false);
  const [suspensionReason, setSuspensionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (router.isReady && typeof router.query.user === "string") setSearchTerm(router.query.user);
  }, [router.isReady, router.query.user]);

  async function loadUsers() {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, full_name, demo_balance, kyc_status, is_suspended, suspension_reason, created_at")
      .eq("is_admin", false)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading users:", error);
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive",
      });
    } else {
      setUsers(data || []);
    }
    setLoading(false);
  }

  async function handleSuspendUser() {
    if (!selectedUser || !suspensionReason.trim()) {
      toast({
        title: "Error",
        description: "Please provide a suspension reason",
        variant: "destructive",
      });
      return;
    }

    setActionLoading(true);

    try {
      // Get current admin user
      const { data: { user: adminUser } } = await supabase.auth.getUser();

      // Update user status
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          is_suspended: true,
          suspension_reason: suspensionReason,
        })
        .eq("id", selectedUser.id);

      if (updateError) throw updateError;

      // Create audit log
      await supabase.from("audit_logs").insert({
        admin_id: adminUser?.id,
        action: "suspend_user",
        entity_type: "profile",
        entity_id: selectedUser.id,
        changes: {
          user_email: selectedUser.email,
          suspension_reason: suspensionReason,
        },
      });

      toast({
        title: "User Suspended",
        description: `${selectedUser.email} has been suspended`,
      });

      // Reload users
      await loadUsers();
      setSuspendDialogOpen(false);
      setSuspensionReason("");
      setSelectedUser(null);
    } catch (error) {
      console.error("Error suspending user:", error);
      toast({
        title: "Error",
        description: "Failed to suspend user",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleUnsuspendUser() {
    if (!selectedUser) return;

    setActionLoading(true);

    try {
      // Get current admin user
      const { data: { user: adminUser } } = await supabase.auth.getUser();

      // Update user status
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          is_suspended: false,
          suspension_reason: null,
        })
        .eq("id", selectedUser.id);

      if (updateError) throw updateError;

      // Create audit log
      await supabase.from("audit_logs").insert({
        admin_id: adminUser?.id,
        action: "unsuspend_user",
        entity_type: "profile",
        entity_id: selectedUser.id,
        changes: {
          user_email: selectedUser.email,
          previous_reason: selectedUser.suspension_reason,
        },
      });

      toast({
        title: "User Unsuspended",
        description: `${selectedUser.email} has been reactivated`,
      });

      // Reload users
      await loadUsers();
      setUnsuspendDialogOpen(false);
      setSelectedUser(null);
    } catch (error) {
      console.error("Error unsuspending user:", error);
      toast({
        title: "Error",
        description: "Failed to unsuspend user",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  }

  function openSuspendDialog(user: User) {
    setSelectedUser(user);
    setSuspensionReason("");
    setSuspendDialogOpen(true);
  }

  function openUnsuspendDialog(user: User) {
    setSelectedUser(user);
    setUnsuspendDialogOpen(true);
  }

  const filteredUsers = users.filter(
    (user) =>
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">User Management</h1>
            <p className="text-muted-foreground mt-1">
              Manage user accounts and permissions
            </p>
          </div>
        </div>

        <Card className="surface">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>All Users</CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 w-64"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-16 rounded animate-pulse bg-background" />
                ))}
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Balance</TableHead>
                      <TableHead>KYC Status</TableHead>
                      <TableHead>Account Status</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No users found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <span className="text-xs font-semibold">
                                  {user.full_name?.charAt(0) || user.email?.charAt(0) || "?"}
                                </span>
                              </div>
                              <span className="font-medium">{user.full_name || "Unknown"}</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-xs">{user.email}</TableCell>
                          <TableCell className="font-mono font-semibold">
                            ${user.demo_balance?.toFixed(2) || "0.00"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                user.kyc_status === "approved"
                                  ? "default"
                                  : user.kyc_status === "pending"
                                  ? "secondary"
                                  : "outline"
                              }
                              className="text-xs"
                            >
                              {user.kyc_status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {user.is_suspended ? (
                              <div className="flex flex-col gap-1">
                                <Badge variant="destructive" className="text-xs w-fit">
                                  <Ban className="h-3 w-3 mr-1" />
                                  Suspended
                                </Badge>
                                {user.suspension_reason && (
                                  <span className="text-xs text-muted-foreground">
                                    {user.suspension_reason}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <Badge variant="outline" className="text-xs">
                                <CheckCircle className="h-3 w-3 mr-1 text-success" />
                                Active
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(user.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              {user.is_suspended ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openUnsuspendDialog(user)}
                                  className="text-xs"
                                >
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Unsuspend
                                </Button>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openSuspendDialog(user)}
                                  className="text-xs text-danger hover:text-danger"
                                >
                                  <Ban className="h-3 w-3 mr-1" />
                                  Suspend
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Suspend User Dialog */}
      <Dialog open={suspendDialogOpen} onOpenChange={setSuspendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-danger" />
              Suspend User Account
            </DialogTitle>
            <DialogDescription>
              This will immediately block {selectedUser?.email} from accessing their account.
              They will not be able to log in or place bets.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="suspension-reason">Suspension Reason *</Label>
              <Textarea
                id="suspension-reason"
                value={suspensionReason}
                onChange={(e) => setSuspensionReason(e.target.value)}
                placeholder="e.g., High-risk betting patterns detected, potential fraud investigation..."
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                This reason will be stored in the audit log and shown to the user.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSuspendDialogOpen(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleSuspendUser}
              disabled={actionLoading || !suspensionReason.trim()}
            >
              {actionLoading ? "Suspending..." : "Suspend Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unsuspend User Dialog */}
      <Dialog open={unsuspendDialogOpen} onOpenChange={setUnsuspendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-success" />
              Unsuspend User Account
            </DialogTitle>
            <DialogDescription>
              This will restore access for {selectedUser?.email}. They will be able to log in
              and use their account normally.
            </DialogDescription>
          </DialogHeader>
          {selectedUser?.suspension_reason && (
            <div className="py-4 space-y-2">
              <Label>Previous Suspension Reason:</Label>
              <div className="p-3 rounded-lg bg-muted/50 text-sm">
                {selectedUser.suspension_reason}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setUnsuspendDialogOpen(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button onClick={handleUnsuspendUser} disabled={actionLoading}>
              {actionLoading ? "Unsuspending..." : "Unsuspend Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

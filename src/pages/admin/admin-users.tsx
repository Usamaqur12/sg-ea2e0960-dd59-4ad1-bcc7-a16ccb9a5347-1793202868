import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Shield, UserPlus, Trash2, Edit } from "lucide-react";
import { ADMIN_ROLES } from "@/lib/adminRoles";

interface AdminUser {
  id: string;
  email: string;
  admin_role: string;
  is_suspended: boolean;
  created_at: string;
}

export default function AdminUsersPage() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminRole, setNewAdminRole] = useState<string>("admin");
  const [currentUserRole, setCurrentUserRole] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    loadCurrentUser();
    loadAdmins();
  }, []);

  async function loadCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("admin_role")
      .eq("id", user.id)
      .single();

    setCurrentUserRole(profile?.admin_role || "admin");
  }

  async function loadAdmins() {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, admin_role, is_suspended, created_at")
        .eq("is_admin", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAdmins(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading admins",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleAddAdmin() {
    if (!newAdminEmail || !newAdminRole) {
      toast({
        title: "Validation error",
        description: "Email and role are required",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      // Check if user exists
      const { data: existingUser, error: searchError } = await supabase
        .from("profiles")
        .select("id, email, is_admin")
        .eq("email", newAdminEmail.toLowerCase())
        .maybeSingle();

      if (searchError) throw searchError;

      if (!existingUser) {
        toast({
          title: "User not found",
          description: "This email is not registered. User must register first.",
          variant: "destructive",
        });
        return;
      }

      if (existingUser.is_admin) {
        toast({
          title: "Already an admin",
          description: "This user is already an admin.",
          variant: "destructive",
        });
        return;
      }

      // Promote to admin
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          is_admin: true,
          admin_role: newAdminRole,
        })
        .eq("id", existingUser.id);

      if (updateError) throw updateError;

      toast({
        title: "Admin added",
        description: `${newAdminEmail} is now an admin with role: ${newAdminRole}`,
      });

      setShowAddDialog(false);
      setNewAdminEmail("");
      setNewAdminRole("admin");
      loadAdmins();
    } catch (error: any) {
      toast({
        title: "Error adding admin",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleRemoveAdmin(adminId: string, email: string) {
    if (!confirm(`Remove admin access for ${email}?`)) return;

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          is_admin: false,
          admin_role: null,
        })
        .eq("id", adminId);

      if (error) throw error;

      toast({
        title: "Admin removed",
        description: `${email} no longer has admin access`,
      });

      loadAdmins();
    } catch (error: any) {
      toast({
        title: "Error removing admin",
        description: error.message,
        variant: "destructive",
      });
    }
  }

  async function handleToggleSuspend(adminId: string, currentStatus: boolean) {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ is_suspended: !currentStatus })
        .eq("id", adminId);

      if (error) throw error;

      toast({
        title: currentStatus ? "Admin unsuspended" : "Admin suspended",
      });

      loadAdmins();
    } catch (error: any) {
      toast({
        title: "Error updating admin",
        description: error.message,
        variant: "destructive",
      });
    }
  }

  const isSuperAdmin = currentUserRole === "super_admin";

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Shield className="h-8 w-8 text-primary" />
              Admin Users
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage admin users and their roles
            </p>
          </div>
          {isSuperAdmin && (
            <Button onClick={() => setShowAddDialog(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Add Admin
            </Button>
          )}
        </div>

        {!isSuperAdmin && (
          <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <p className="text-sm text-amber-900 dark:text-amber-100">
              Only Super Admins can add or remove admin users.
            </p>
          </div>
        )}

        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Added</TableHead>
                {isSuperAdmin && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : admins.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No admin users found
                  </TableCell>
                </TableRow>
              ) : (
                admins.map((admin) => (
                  <TableRow key={admin.id}>
                    <TableCell className="font-medium">{admin.email}</TableCell>
                    <TableCell>
                      <Badge variant={admin.admin_role === "super_admin" ? "default" : "secondary"}>
                        {admin.admin_role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {admin.is_suspended ? (
                        <Badge variant="destructive">Suspended</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          Active
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(admin.created_at).toLocaleDateString()}
                    </TableCell>
                    {isSuperAdmin && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleToggleSuspend(admin.id, admin.is_suspended)}
                          >
                            {admin.is_suspended ? "Unsuspend" : "Suspend"}
                          </Button>
                          {admin.admin_role !== "super_admin" && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleRemoveAdmin(admin.id, admin.email)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Add Admin Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Admin</DialogTitle>
            <DialogDescription>
              Promote an existing user to admin. User must be registered first.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">User Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={newAdminEmail}
                onChange={(e) => setNewAdminEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Admin Role</Label>
              <Select value={newAdminRole} onValueChange={setNewAdminRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ADMIN_ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                <strong>super_admin:</strong> Full access<br/>
                <strong>admin:</strong> Full access<br/>
                <strong>finance:</strong> Payments, transactions, crypto<br/>
                <strong>kyc:</strong> KYC verification<br/>
                <strong>support:</strong> User support, announcements<br/>
                <strong>risk_manager:</strong> Risk, bets monitoring<br/>
                <strong>sports_trader:</strong> Sports, trading, bets
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddAdmin} disabled={loading}>
              Add Admin
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
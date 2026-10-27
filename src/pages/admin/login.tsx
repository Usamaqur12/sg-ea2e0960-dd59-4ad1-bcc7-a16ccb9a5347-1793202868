import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Lock, Mail, AlertCircle } from "lucide-react";
import { isAdminRole } from "@/lib/adminRoles";

export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Sign in with Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("Auth error:", error);
        setError(error.message);
        setLoading(false);
        return;
      }

      if (!data.user) {
        setError("Login failed - no user data returned");
        setLoading(false);
        return;
      }

      console.log("Authenticated user ID:", data.user.id);

      // Check if user has admin role - query multiple fields to ensure RLS allows read
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("admin_role, is_admin, is_suspended, full_name")
        .eq("id", data.user.id)
        .single();

      console.log("Profile query result:", { profile, profileError });

      if (profileError) {
        console.error("Profile query error:", profileError);
        await supabase.auth.signOut();
        setError(`Access denied - profile error: ${profileError.message}`);
        setLoading(false);
        return;
      }

      if (!profile) {
        console.error("No profile found for user:", data.user.id);
        await supabase.auth.signOut();
        setError("Access denied - admin account not found");
        setLoading(false);
        return;
      }

      // Check if account is suspended
      if (profile.is_suspended) {
        await supabase.auth.signOut();
        setError("Access denied - account suspended");
        setLoading(false);
        return;
      }

      // Verify admin role exists and is valid
      if (!profile.admin_role) {
        console.error("User has no admin_role:", profile);
        await supabase.auth.signOut();
        setError("Access denied - no admin role assigned");
        setLoading(false);
        return;
      }

      if (!isAdminRole(profile.admin_role)) {
        console.error("Invalid admin role:", profile.admin_role);
        await supabase.auth.signOut();
        setError("Access denied - insufficient permissions");
        setLoading(false);
        return;
      }

      // 2FA requirement removed - redirect directly to admin portal
      await router.push("/admin");
    } catch (err) {
      console.error("Login error:", err);
      setError("An unexpected error occurred");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md surface">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-3">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Shield className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">PrimeBet Admin</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Secure admin portal access
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="p-3 rounded bg-danger/10 border border-danger/30 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-danger flex-shrink-0 mt-0.5" />
                <p className="text-sm text-danger">{error}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Admin Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@primebet.com"
                required
                disabled={loading}
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={loading}
                className="h-11"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-primary hover:bg-primary/90 font-bold"
            >
              {loading ? "Authenticating..." : "Access Admin Portal"}
            </Button>

            <div className="pt-4 border-t border-border text-center">
              <p className="text-xs text-muted-foreground">
                This is a secure area. Unauthorized access is prohibited.
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

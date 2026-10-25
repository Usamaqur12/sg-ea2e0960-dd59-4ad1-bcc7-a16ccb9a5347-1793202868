import { useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Lock, Mail, AlertCircle } from "lucide-react";
import { isAdminRole } from "@/lib/adminRoles";
import { DEMO_ADMIN_EMAIL, DEMO_ADMIN_PASSWORD, DEMO_BACKEND_ENABLED } from "@/integrations/supabase/demoClient";

export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState(DEMO_BACKEND_ENABLED ? DEMO_ADMIN_EMAIL : "");
  const [password, setPassword] = useState(DEMO_BACKEND_ENABLED ? DEMO_ADMIN_PASSWORD : "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaChallengeId, setMfaChallengeId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");

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

      const assurance = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (assurance.error || assurance.data.nextLevel !== "aal2") {
        await supabase.auth.signOut();
        setError("Admin accounts must enable authenticator-app 2FA in Account Settings before using the admin portal.");
        setLoading(false);
        return;
      }
      if (assurance.data.currentLevel !== "aal2") {
        const factors = await supabase.auth.mfa.listFactors();
        const factor = factors.data?.totp.find((item) => item.status === "verified");
        if (!factor) throw new Error("No verified authenticator factor is available");
        const challenge = await supabase.auth.mfa.challenge({ factorId: factor.id });
        if (challenge.error) throw challenge.error;
        setMfaFactorId(factor.id); setMfaChallengeId(challenge.data.id); setLoading(false); return;
      }
      await router.push("/admin");
    } catch (err) {
      console.error("Login error:", err);
      setError("An unexpected error occurred");
      setLoading(false);
    }
  }

  async function handleMfa(e: React.FormEvent) {
    e.preventDefault(); setError("");
    if (!mfaFactorId || !mfaChallengeId || mfaCode.length !== 6) return;
    setLoading(true);
    const result = await supabase.auth.mfa.verify({ factorId: mfaFactorId, challengeId: mfaChallengeId, code: mfaCode });
    if (result.error) setError(result.error.message); else await router.push("/admin");
    setLoading(false);
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
          {DEMO_BACKEND_ENABLED && (
            <div className="mb-4 rounded-lg border border-primary/30 bg-primary/10 p-3 text-sm">
              <p className="font-semibold text-primary">Demo admin enabled</p>
              <p className="mt-1 text-xs text-muted-foreground">Credentials are prefilled. Demo changes are stored only in this browser.</p>
            </div>
          )}
          <form onSubmit={mfaFactorId ? handleMfa : handleLogin} className="space-y-4">
            {error && (
              <div className="p-3 rounded bg-danger/10 border border-danger/30 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-danger flex-shrink-0 mt-0.5" />
                <p className="text-sm text-danger">{error}</p>
              </div>
            )}

            {mfaFactorId ? <div className="space-y-2"><Label htmlFor="mfa-code" className="flex items-center gap-2"><Shield className="h-4 w-4" />Authenticator code</Label><Input id="mfa-code" inputMode="numeric" pattern="[0-9]*" maxLength={6} autoComplete="one-time-code" value={mfaCode} onChange={(event) => setMfaCode(event.target.value.replace(/\D/g, ""))} placeholder="123456" autoFocus /></div> : <>
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
            </>}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-primary hover:bg-primary/90 font-bold"
            >
              {loading ? "Authenticating..." : mfaFactorId ? "Verify and continue" : "Access Admin Portal"}
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

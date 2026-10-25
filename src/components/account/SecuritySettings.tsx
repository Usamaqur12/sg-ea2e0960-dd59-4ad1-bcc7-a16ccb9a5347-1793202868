import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

type MfaFactor = { id: string; status: "verified" | "unverified"; friendly_name?: string };
type Enrollment = { factorId: string; qrCode: string; secret: string };

export function SecuritySettings() {
  const { toast } = useToast();
  const [factors, setFactors] = useState<MfaFactor[]>([]);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [sessionExpiry, setSessionExpiry] = useState<number | null>(null);
  const [assuranceLevel, setAssuranceLevel] = useState<string>("aal1");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshSecurity = useCallback(async () => {
    const [factorResult, sessionResult, assuranceResult] = await Promise.all([
      supabase.auth.mfa.listFactors(), supabase.auth.getSession(), supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    ]);
    if (factorResult.error) setError(factorResult.error.message);
    else setFactors((factorResult.data.totp ?? []) as MfaFactor[]);
    setSessionExpiry(sessionResult.data.session?.expires_at ?? null);
    if (!assuranceResult.error) setAssuranceLevel(assuranceResult.data.currentLevel ?? "aal1");
  }, []);

  useEffect(() => { void refreshSecurity(); }, [refreshSecurity]);
  const verifiedFactor = factors.find((factor) => factor.status === "verified");

  async function beginEnrollment() {
    setBusy(true); setError(null);
    for (const factor of factors.filter((item) => item.status === "unverified")) await supabase.auth.mfa.unenroll({ factorId: factor.id });
    const { data, error: enrollError } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "PrimeBet authenticator" });
    if (enrollError) setError(enrollError.message);
    else setEnrollment({ factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret });
    setBusy(false);
  }

  async function verifyEnrollment() {
    if (!enrollment || verificationCode.trim().length !== 6) return;
    setBusy(true); setError(null);
    const challenge = await supabase.auth.mfa.challenge({ factorId: enrollment.factorId });
    if (challenge.error) { setError(challenge.error.message); setBusy(false); return; }
    const verification = await supabase.auth.mfa.verify({ factorId: enrollment.factorId, challengeId: challenge.data.id, code: verificationCode.trim() });
    if (verification.error) setError(verification.error.message);
    else {
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) await supabase.from("profiles").update({ two_factor_enabled: true }).eq("id", userData.user.id);
      setEnrollment(null); setVerificationCode(""); await refreshSecurity(); toast({ title: "Two-factor authentication enabled" });
    }
    setBusy(false);
  }

  async function disableMfa() {
    if (!verifiedFactor) return;
    setBusy(true); setError(null);
    const result = await supabase.auth.mfa.unenroll({ factorId: verifiedFactor.id });
    if (result.error) setError(result.error.message);
    else {
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) await supabase.from("profiles").update({ two_factor_enabled: false }).eq("id", userData.user.id);
      await refreshSecurity(); toast({ title: "Two-factor authentication disabled" });
    }
    setBusy(false);
  }

  async function revokeOtherSessions() {
    setBusy(true); setError(null);
    const { error: signOutError } = await supabase.auth.signOut({ scope: "others" });
    if (signOutError) setError(signOutError.message); else toast({ title: "Other sessions signed out" });
    setBusy(false);
  }

  async function changePassword() {
    setError(null);
    if (password.length < 12) { setError("Use at least 12 characters for the new password."); return; }
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }
    setBusy(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) setError(updateError.message);
    else { await supabase.auth.signOut({ scope: "others" }); setPassword(""); setConfirmPassword(""); toast({ title: "Password updated", description: "Other sessions were signed out." }); }
    setBusy(false);
  }

  return <div className="space-y-6">
    {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
    <div className="flex items-center justify-between gap-4"><div><div className="font-medium">Authenticator app (TOTP)</div><div className="text-sm text-muted-foreground">Require a six-digit code on sign-in.</div></div><Switch checked={Boolean(verifiedFactor)} disabled={busy} onCheckedChange={(enabled) => void (enabled ? beginEnrollment() : disableMfa())} /></div>
    {enrollment && <div className="space-y-4 rounded border border-primary/30 p-4"><p className="text-sm">Scan this QR code with your authenticator app, then enter the six-digit code.</p><div className="flex flex-col gap-4 sm:flex-row sm:items-center"><Image src={enrollment.qrCode} alt="Authenticator QR code" width={160} height={160} unoptimized className="h-40 w-40 rounded bg-white p-2" /><div className="min-w-0 space-y-3"><div><Label>Manual setup secret</Label><code className="mt-1 block break-all rounded bg-muted p-2 text-xs">{enrollment.secret}</code></div><Input inputMode="numeric" pattern="[0-9]*" maxLength={6} placeholder="123456" value={verificationCode} onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, ""))} /><div className="flex gap-2"><Button onClick={() => void verifyEnrollment()} disabled={busy || verificationCode.length !== 6}>Verify and enable</Button><Button variant="outline" onClick={() => setEnrollment(null)}>Cancel</Button></div></div></div></div>}
    <div className="space-y-3 border-t border-border pt-5"><div><div className="font-medium">Current session</div><div className="text-sm text-muted-foreground">Security level {assuranceLevel.toUpperCase()} · expires {sessionExpiry ? new Date(sessionExpiry * 1000).toLocaleString() : "unknown"}</div></div><Button variant="outline" onClick={() => void revokeOtherSessions()} disabled={busy}>Sign out all other sessions</Button></div>
    <div className="space-y-3 border-t border-border pt-5"><div><div className="font-medium">Change password</div><div className="text-sm text-muted-foreground">Use at least 12 characters. Other sessions will be revoked.</div></div><div className="grid gap-3 sm:grid-cols-2"><Input type="password" placeholder="New password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} /><Input type="password" placeholder="Confirm new password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></div><Button onClick={() => void changePassword()} disabled={busy || !password}>Update password</Button></div>
  </div>;
}

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, Download, FileText, Search, Settings, Shield, User } from "lucide-react";
import { canAccessAdminArea } from "@/lib/adminRoles";
import { useToast } from "@/hooks/use-toast";

interface AuditLog { id: string; timestamp: string; adminUser: string; action: string; entity: string; entityId: string; details: string; severity: "info" | "warning" | "critical"; }

function severityFor(action: string): AuditLog["severity"] {
  const normalized = action.toLowerCase();
  if (["suspend", "block", "delete", "reject", "failed"].some((term) => normalized.includes(term))) return "critical";
  if (["update", "adjust", "change", "cancel"].some((term) => normalized.includes(term))) return "warning";
  return "info";
}

function csvCell(value: string) { return `"${value.replaceAll('"', '""')}"`; }

export default function AuditLogs() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSeverity, setSelectedSeverity] = useState("all");
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  useEffect(() => { void initialize(); }, []);

  async function initialize() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { await router.push("/auth/login"); return; }
    const { data: profile } = await supabase.from("profiles").select("admin_role").eq("id", user.id).single();
    if (!profile || !canAccessAdminArea(profile.admin_role, "audit")) { await router.push("/"); return; }
    await loadAuditLogs();
  }

  async function loadAuditLogs() {
    setLoading(true);
    const logResult = await supabase.from("audit_logs").select("id, admin_id, action, entity_type, entity_id, changes, created_at").order("created_at", { ascending: false }).limit(500);
    if (logResult.error) { toast({ title: "Audit logs load failed", description: logResult.error.message, variant: "destructive" }); setLoading(false); return; }
    const rawLogs = logResult.data ?? [];
    const adminIds = [...new Set(rawLogs.map((log) => log.admin_id))];
    const profileResult = adminIds.length > 0 ? await supabase.from("profiles").select("id, email, full_name").in("id", adminIds) : { data: [], error: null };
    const profiles = new Map((profileResult.data ?? []).map((profile) => [profile.id, profile]));
    setAuditLogs(rawLogs.map((log) => {
      const admin = profiles.get(log.admin_id);
      return { id: log.id, timestamp: log.created_at ?? new Date().toISOString(), adminUser: admin?.email || admin?.full_name || log.admin_id, action: log.action, entity: log.entity_type, entityId: log.entity_id || "—", details: log.changes ? JSON.stringify(log.changes) : "No additional details", severity: severityFor(log.action) };
    }));
    setLoading(false);
  }

  const filteredLogs = auditLogs.filter((log) => {
    const needle = searchQuery.toLowerCase();
    return (log.action.toLowerCase().includes(needle) || log.adminUser.toLowerCase().includes(needle) || log.details.toLowerCase().includes(needle)) && (selectedSeverity === "all" || log.severity === selectedSeverity);
  });

  function exportLogs() {
    const header = ["Timestamp", "Admin", "Action", "Entity", "Entity ID", "Severity", "Details"];
    const rows = filteredLogs.map((log) => [log.timestamp, log.adminUser, log.action, log.entity, log.entityId, log.severity, log.details]);
    const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const severityBadge = (severity: AuditLog["severity"]) => severity === "critical" ? <Badge variant="destructive">Critical</Badge> : severity === "warning" ? <Badge className="bg-warning/10 text-warning border-warning/30">Warning</Badge> : <Badge variant="outline">Info</Badge>;
  const actionIcon = (action: string) => action.match(/user|balance/i) ? <User className="h-4 w-4 text-primary" /> : action.match(/settings|config/i) ? <Settings className="h-4 w-4 text-warning" /> : action.match(/suspend|block|delete/i) ? <Shield className="h-4 w-4 text-danger" /> : <FileText className="h-4 w-4 text-muted-foreground" />;

  return (
    <AdminLayout><div className="space-y-6">
      <div className="flex items-center justify-between gap-4"><div><h1 className="text-2xl font-bold mb-1 flex items-center gap-2"><FileText className="h-6 w-6 text-primary" />Audit Logs</h1><p className="text-sm text-muted-foreground">Immutable administrative activity from the database</p></div><Button className="gap-2" onClick={exportLogs} disabled={filteredLogs.length === 0}><Download className="h-4 w-4" />Export CSV</Button></div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{(["all", "critical", "warning", "info"] as const).map((severity) => <Card className="surface" key={severity}><CardContent className="p-4"><div className="text-sm text-muted-foreground mb-1 capitalize">{severity === "all" ? "Total Actions" : severity}</div><div className="text-2xl font-bold">{severity === "all" ? auditLogs.length : auditLogs.filter((log) => log.severity === severity).length}</div></CardContent></Card>)}</div>
      <Card className="surface"><CardContent className="p-4"><div className="flex flex-col md:flex-row gap-3"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search logs..." value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className="pl-9" /></div><div className="flex flex-wrap gap-2">{["all", "critical", "warning", "info"].map((severity) => <Button key={severity} variant={selectedSeverity === severity ? "default" : "outline"} size="sm" onClick={() => setSelectedSeverity(severity)} className="capitalize">{severity}</Button>)}</div></div></CardContent></Card>
      <Card className="surface"><CardHeader><CardTitle className="text-lg">Recent Activity</CardTitle></CardHeader><CardContent>
        {loading ? <div className="text-center py-8"><div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div> : filteredLogs.length === 0 ? <div className="text-center py-8 text-muted-foreground"><AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-50" /><p>No audit logs found</p></div> : <ScrollArea className="h-[600px] pr-4"><div className="space-y-3">{filteredLogs.map((log) => (
          <div key={log.id} className="p-4 rounded bg-background border border-border"><div className="flex items-start justify-between mb-3"><div className="flex items-start gap-3">{actionIcon(log.action)}<div><div className="font-semibold text-sm mb-1">{log.action}</div><div className="text-xs text-muted-foreground">{new Date(log.timestamp).toLocaleString()}</div></div></div>{severityBadge(log.severity)}</div><div className="pl-7 space-y-2"><div className="text-xs"><span className="text-muted-foreground">Admin: </span><span className="font-medium">{log.adminUser}</span></div><div className="text-xs"><span className="text-muted-foreground">Entity: </span><span className="font-medium">{log.entity}</span><span className="text-muted-foreground ml-2">ID: </span><span className="font-mono">{log.entityId}</span></div><div className="text-xs p-2 rounded bg-muted/10 border border-border/50 break-words">{log.details}</div></div></div>
        ))}</div></ScrollArea>}
      </CardContent></Card>
    </div></AdminLayout>
  );
}

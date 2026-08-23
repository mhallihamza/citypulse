import { useState } from "react";
import { useParams } from "react-router-dom";
import { Building2, Check, Copy, KeyRound, LayoutGrid, ShieldCheck, User, Users } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Form";
import { EmptyState } from "@/components/ui/Modal";
import { ServiceIconBadge } from "@/components/ui/ServiceIcon";
import { errMsg } from "@/lib/api";
import { timeAgo } from "@/lib/format";
import { SERVICES } from "@/lib/services";
import { cn } from "@/lib/utils";
import type { TabId } from "./settings-types";

const TABS: { id: TabId; label: string; icon: typeof User }[] = [
  { id: "profile", label: "Profile", icon: User },
  { id: "organization", label: "Organization", icon: Building2 },
  { id: "users", label: "Users", icon: Users },
  { id: "services", label: "Services", icon: LayoutGrid },
  { id: "security", label: "Security", icon: ShieldCheck },
];

export function SettingsPage({ tab: forcedTab }: { tab?: TabId }) {
  const params = useParams<{ tab: string }>();
  const { profile, organization, services, users, invites, isAdmin } = useApp();
  const [tab, setTab] = useState<TabId>((forcedTab ?? (params.tab as TabId) ?? "profile") as TabId);

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <div className="w-full shrink-0 lg:w-60">
        <PageHeader title="Settings" subtitle="Manage your workspace" className="mb-4 lg:hidden" />
        <nav className="flex flex-row gap-1 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-semibold transition-colors",
                  tab === t.id ? "bg-ink-900 text-white" : "text-ink-600 hover:bg-ink-100"
                )}
              >
                <Icon className="h-4 w-4" /> {t.label}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="min-w-0 flex-1">
        {tab === "profile" && <ProfileTab />}
        {tab === "organization" && <OrganizationTab />}
        {tab === "users" && <UsersTab />}
        {tab === "services" && <ServicesTab />}
        {tab === "security" && <SecurityTab isAdmin={isAdmin} />}
      </div>
    </div>
  );
}

function ProfileTab() {
  const { profile, organization } = useApp();
  if (!profile) return null;
  return (
    <Card>
      <CardHeader title="Profile" subtitle="Your identity — loaded from Supabase Auth and the profiles table" />
      <CardBody className="space-y-3">
        <SettingRow icon={<User className="h-4 w-4" />} label="Full name" value={profile.fullName} />
        <SettingRow icon={<KeyRound className="h-4 w-4" />} label="Email" value={profile.email} />
        <SettingRow icon={<ShieldCheck className="h-4 w-4" />} label="Role" value={profile.role} />
        <SettingRow icon={<Building2 className="h-4 w-4" />} label="Organization" value={organization?.name ?? "—"} />
        <div className="rounded-lg border border-pulse-100 bg-pulse-50 p-3 text-xs leading-relaxed text-pulse-800">
          Authentication is handled by Supabase Auth (signUp / signInWithPassword / signOut).
          Passwords are never stored in application tables.
        </div>
      </CardBody>
    </Card>
  );
}

function OrganizationTab() {
  const { organization, services } = useApp();
  if (!organization) {
    return (
      <Card>
        <EmptyState title="No organization yet." message="Create or join an organization to activate the platform." className="py-12" />
      </Card>
    );
  }
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader title="Organization" subtitle="Loaded from the organizations table" />
        <CardBody className="space-y-3">
          <SettingRow icon={<Building2 className="h-4 w-4" />} label="Name" value={organization.name} />
          <SettingRow icon={<LayoutGrid className="h-4 w-4" />} label="Slug" value={<span className="font-mono text-xs">{organization.slug}</span>} />
          <SettingRow icon={<Building2 className="h-4 w-4" />} label="Type" value={organization.type} />
          {organization.region && <SettingRow icon={<Building2 className="h-4 w-4" />} label="Region" value={organization.region} />}
          <CopyableRow label="Organization ID" value={organization.id} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Enabled services" subtitle="Per-tenant service configuration" />
        <CardBody className="grid gap-2 sm:grid-cols-2">
          {SERVICES.map((s) => {
            const svc = services.find((x) => x.name === s.key);
            const enabled = svc?.enabled ?? s.connected;
            return (
              <div key={s.key} className="flex items-center justify-between rounded-lg border border-ink-100 px-3 py-2.5">
                <span className="text-[13px] font-semibold text-ink-700">{s.name}</span>
                <Badge tone={enabled ? "success" : "neutral"} dot>{enabled ? "Enabled" : "Disabled"}</Badge>
              </div>
            );
          })}
        </CardBody>
      </Card>
    </div>
  );
}

function UsersTab() {
  const { users, invites, isAdmin, createInvite, revokeInvite, toast } = useApp();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("operator");
  const [lastCode, setLastCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const issue = async () => {
    setError("");
    if (!email.includes("@")) {
      setError("Enter a valid email address.");
      return;
    }
    setBusy(true);
    try {
      const code = await createInvite(email.trim(), role);
      setLastCode(code);
      setEmail("");
      toast({ title: "Invite created", message: `Code ${code} — share it with the invitee.`, severity: "success" });
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader title="Users" subtitle="Members of your organization (profiles)" />
        <CardBody className="space-y-2">
          {users.length === 0 && <EmptyState title="No members yet." className="py-8" />}
          {users.map((u) => (
            <div key={u.id} className="flex items-center justify-between rounded-lg border border-ink-100 px-3 py-2.5">
              <div>
                <div className="text-[13px] font-semibold text-ink-800">{u.fullName}</div>
                <div className="text-[11px] text-ink-400">{u.email}</div>
              </div>
              <Badge tone={u.role === "admin" ? "brand" : "neutral"}>{u.role}</Badge>
            </div>
          ))}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Invitations" subtitle="Joining requires an admin-issued code bound to the invitee's email." />
        <CardBody className="space-y-4">
          {isAdmin ? (
            <div className="grid gap-3 sm:grid-cols-[1fr_160px_auto] sm:items-end">
              <Field label="Invite email">
                <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="colleague@city.gov" />
              </Field>
              <Field label="Role">
                <Select value={role} onChange={(e) => setRole(e.target.value)}>
                  <option value="operator">Operator</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="viewer">Viewer</option>
                  <option value="admin">Admin</option>
                </Select>
              </Field>
              <Button loading={busy} onClick={() => void issue()}>Create invite</Button>
            </div>
          ) : (
            <p className="text-sm text-ink-500">Only organization admins can issue invitations.</p>
          )}
          {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">{error}</div>}
          {lastCode && (
            <div className="rounded-lg border border-live-200 bg-live-50 px-3 py-2 text-sm text-live-800">
              Invite code: <span className="font-mono font-bold">{lastCode}</span> — valid 7 days, bound to the invited email.
            </div>
          )}

          <div className="space-y-2 border-t border-ink-100 pt-3">
            {invites.length === 0 && <p className="text-xs text-ink-400">No invites issued yet.</p>}
            {invites.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between gap-3 rounded-lg border border-ink-100 px-3 py-2.5">
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-semibold text-ink-800">
                    <span className="font-mono">{inv.code}</span> · {inv.email}
                  </div>
                  <div className="text-[11px] text-ink-400">role: {inv.role} · created {timeAgo(inv.createdAt)}</div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge tone={inv.status === "PENDING" ? "warning" : inv.status === "ACCEPTED" ? "success" : "neutral"}>{inv.status}</Badge>
                  {isAdmin && inv.status === "PENDING" && (
                    <Button variant="ghost" size="xs" onClick={() => void revokeInvite(inv.id)}>Revoke</Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

function ServicesTab() {
  const { services, devices } = useApp();
  return (
    <Card>
      <CardHeader title="Services" subtitle="CITYPULSE supports four city services — Lighting is live today" />
      <CardBody className="grid gap-3 sm:grid-cols-2">
        {SERVICES.map((s) => {
          const svc = services.find((x) => x.name === s.key);
          const count = devices.filter((d) => d.service === s.key).length;
          return (
            <div key={s.key} className="flex items-center justify-between rounded-xl border border-ink-100 p-4">
              <div className="flex items-center gap-3">
                <ServiceIconBadge service={s.key} size="sm" />
                <div>
                  <div className="text-sm font-bold text-ink-900">{s.name}</div>
                  <div className="text-xs text-ink-400">
                    {count > 0 ? `${count} registered device${count > 1 ? "s" : ""}` : svc?.enabled ? "Enabled — no devices yet" : "Not enabled"}
                  </div>
                </div>
              </div>
              <Badge tone={s.connected ? "success" : "neutral"} dot>{s.connected ? "Connected" : "Coming soon"}</Badge>
            </div>
          );
        })}
      </CardBody>
    </Card>
  );
}

function SecurityTab({ isAdmin }: { isAdmin: boolean }) {
  const { signOut } = useApp();
  return (
    <Card>
      <CardHeader title="Security" subtitle="Multi-tenant isolation & session management" />
      <CardBody className="space-y-3">
        <SettingRow icon={<ShieldCheck className="h-4 w-4" />} label="Row Level Security" value="Enforced on every table via org policies" />
        <SettingRow icon={<ShieldCheck className="h-4 w-4" />} label="Organization isolation" value="Supabase RLS — never client-side filtering only" />
        <SettingRow icon={<ShieldCheck className="h-4 w-4" />} label="Auth provider" value="Supabase Auth" />
        <SettingRow icon={<ShieldCheck className="h-4 w-4" />} label="Your role" value={<Badge tone={isAdmin ? "brand" : "neutral"}>{isAdmin ? "Admin" : "Member"}</Badge>} />
        <div className="flex justify-end pt-2">
          <Button variant="outline" size="sm" onClick={() => void signOut()}>Sign out</Button>
        </div>
      </CardBody>
    </Card>
  );
}

function SettingRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-ink-50 pb-3 last:border-0 last:pb-0">
      <div className="flex items-center gap-2 text-ink-500">
        {icon}
        <span className="text-[13px] font-semibold">{label}</span>
      </div>
      <div className="text-right text-[13px] font-medium text-ink-800">{value}</div>
    </div>
  );
}

function CopyableRow({ label, value }: { label: string; value: string }) {
  const { toast } = useApp();
  const [copied, setCopied] = useState(false);
  return (
    <SettingRow
      icon={<ShieldCheck className="h-4 w-4" />}
      label={label}
      value={
        <span className="inline-flex items-center gap-1.5">
          <span className="max-w-[220px] truncate font-mono text-xs">{value}</span>
          <button
            onClick={() => {
              navigator.clipboard?.writeText(value).catch(() => {});
              setCopied(true);
              toast({ title: "Copied to clipboard", severity: "success" });
              setTimeout(() => setCopied(false), 1500);
            }}
            className="rounded p-1 text-ink-400 hover:bg-ink-100 hover:text-ink-700"
            aria-label={`Copy ${label}`}
          >
            {copied ? <Check className="h-3.5 w-3.5 text-live-600" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        </span>
      }
    />
  );
}
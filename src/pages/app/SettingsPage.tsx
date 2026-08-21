import { useState } from "react";
import { useParams } from "react-router-dom";
import { User, Building2, Users, ShieldCheck, Bell, LayoutGrid, Plug, KeyRound, Wifi, Copy, ArrowLeft } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Form";
import { cn } from "@/lib/utils";
import type { AppData, Profile } from "@/lib/types";

type TabId = "profile" | "organization" | "users" | "roles" | "notifications" | "services" | "mqtt" | "api" | "security";

const TABS: { id: TabId; label: string; icon: typeof User }[] = [
  { id: "profile", label: "Profile", icon: User },
  { id: "organization", label: "Organization", icon: Building2 },
  { id: "users", label: "Users", icon: Users },
  { id: "roles", label: "Roles & Permissions", icon: ShieldCheck },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "services", label: "Services", icon: LayoutGrid },
  { id: "mqtt", label: "MQTT / Integrations", icon: Plug },
  { id: "api", label: "API", icon: KeyRound },
  { id: "security", label: "Security", icon: ShieldCheck },
];

export function SettingsPage({ tab: forcedTab }: { tab?: TabId }) {
  const params = useParams<{ tab: string }>();
  const { user, updateProfile, data, toast } = useApp();
  const [tab, setTab] = useState<TabId>((forcedTab ?? (params.tab as TabId) ?? "profile") as TabId);
  const [copied, setCopied] = useState(false);

  const copy = (t: string) => {
    navigator.clipboard?.writeText(t).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    toast({ title: "Copied to clipboard", severity: "success" });
  };

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
        {tab === "profile" && <ProfileTab user={user} updateProfile={updateProfile} copy={copy} />}
        {tab === "organization" && <OrganizationTab copy={copy} />}
        {tab === "users" && <UsersTab />}
        {tab === "roles" && <RolesTab />}
        {tab === "notifications" && <NotificationsTab />}
        {tab === "services" && <ServicesTab data={data} />}
        {tab === "mqtt" && <MqttTab />}
        {tab === "api" && <ApiTab copy={copy} />}
        {tab === "security" && <SecurityTab />}
      </div>
    </div>
  );
}

function SettingRow({ icon, label, value, action }: { icon: React.ReactNode; label: string; value: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-ink-50 pb-3 last:border-0">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-ink-100 text-ink-500">{icon}</span>
        <div>
          <div className="text-[13px] font-semibold text-ink-800">{label}</div>
          <div className="font-mono text-xs text-ink-500">{value}</div>
        </div>
      </div>
      {action}
    </div>
  );
}

function ProfileTab({ user, updateProfile, copy }: { user: Profile | null; updateProfile: (p: Partial<Profile>) => void; copy: (t: string) => void }) {
  const [form, setForm] = useState({
    fullName: user?.fullName ?? "",
    email: user?.email ?? "",
    organization: user?.organization ?? "",
  });
  return (
    <Card>
      <CardHeader title="Profile" subtitle="Your personal account information" />
      <CardBody className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name">
            <Input value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} />
          </Field>
          <Field label="Work email">
            <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          </Field>
          <Field label="Organization" className="sm:col-span-2">
            <Input value={form.organization} onChange={(e) => setForm((f) => ({ ...f, organization: e.target.value }))} />
          </Field>
        </div>
        <div className="flex justify-end">
          <Button onClick={() => updateProfile(form)}>Save changes</Button>
        </div>
        <SettingRow icon={<User className="h-4 w-4" />} label="Your user ID" value={user?.id ?? "—"} action={<Button variant="ghost" size="xs" onClick={() => copy(user?.id ?? "")}><Copy className="h-3.5 w-3.5" /></Button>} />
        <SettingRow icon={<ShieldCheck className="h-4 w-4" />} label="Role" value={user?.role ?? "admin"} />
      </CardBody>
    </Card>
  );
}

function OrganizationTab({ copy }: { copy: (t: string) => void }) {
  return (
    <Card>
      <CardHeader title="Organization" subtitle="Organization profile and identifiers" />
      <CardBody className="space-y-3">
        <SettingRow icon={<Building2 className="h-4 w-4" />} label="Organization name" value="Casablanca Urban Operations" action={<Button variant="ghost" size="xs">Edit</Button>} />
        <SettingRow icon={<Wifi className="h-4 w-4" />} label="Slug / subdomain" value="casablanca.citypulse.io" action={<Button variant="ghost" size="xs" onClick={() => copy("casablanca.citypulse.io")}><Copy className="h-3.5 w-3.5" /></Button>} />
        <SettingRow icon={<LayoutGrid className="h-4 w-4" />} label="Organization ID" value="org_casablanca_001" />
        <SettingRow icon={<ShieldCheck className="h-4 w-4" />} label="Plan" value="Enterprise · Annual" />
      </CardBody>
    </Card>
  );
}

const USERS = [
  { name: "Yassine El Amrani", email: "yassine.elamrani@casablanca-city.ma", role: "admin", status: "Active" },
  { name: "Ahmed B.", email: "ahmed.b@citypulse.ops", role: "operator", status: "Active" },
  { name: "Sara K.", email: "sara.k@citypulse.ops", role: "operator", status: "Active" },
  { name: "Nadia F.", email: "nadia.f@citypulse.ops", role: "supervisor", status: "Inactive" },
];

function UsersTab() {
  return (
    <Card className="overflow-hidden">
      <CardHeader title="Users" subtitle="People with access to this workspace" action={<Button size="sm">Invite user</Button>} />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-ink-100 bg-ink-50/60 text-left text-[11px] uppercase tracking-widest text-ink-400">
              <th className="px-5 py-3 font-semibold">User</th>
              <th className="px-4 py-3 font-semibold">Role</th>
              <th className="px-4 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-50">
            {USERS.map((u) => (
              <tr key={u.email}>
                <td className="px-5 py-3">
                  <div className="font-semibold text-ink-800">{u.name}</div>
                  <div className="text-[11px] text-ink-400">{u.email}</div>
                </td>
                <td className="px-4 py-3"><Badge tone="info">{u.role}</Badge></td>
                <td className="px-4 py-3"><Badge tone={u.status === "Active" ? "success" : "offline"} dot>{u.status}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function RolesTab() {
  const roles = [
    { name: "Admin", desc: "Full access to every part of the platform and organization settings.", badge: "danger" as const },
    { name: "Supervisor", desc: "Monitor operations, assign tickets, manage teams.", badge: "warning" as const },
    { name: "Operator", desc: "Monitor services, receive events, manage assigned tickets.", badge: "info" as const },
    { name: "Viewer", desc: "Read-only access to dashboards and reports.", badge: "neutral" as const },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {roles.map((r) => (
        <Card key={r.name}>
          <CardBody>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold text-ink-900"><ShieldCheck className="h-4 w-4 text-pulse-600" /> {r.name}</div>
              <Badge tone={r.badge}>{r.name === "Viewer" ? "Read-only" : "Edit"}</Badge>
            </div>
            <p className="mt-2 text-[13px] text-ink-500">{r.desc}</p>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}

function NotificationsTab() {
  const rows = [
    "Critical events & failures",
    "AI generated recommendations",
    "Ticket assignments & updates",
    "Device offline alerts",
    "Water leak / anomaly alerts",
    "Weekly performance digest",
  ];
  return (
    <Card>
      <CardHeader title="Notification preferences" subtitle="Choose which alerts are delivered" />
      <CardBody className="space-y-2">
        {rows.map((r) => (
          <label key={r} className="flex cursor-pointer items-center justify-between rounded-lg border border-ink-100 px-3 py-2.5">
            <span className="text-sm font-medium text-ink-700">{r}</span>
            <input type="checkbox" defaultChecked className="h-4 w-4 accent-pulse-600" />
          </label>
        ))}
      </CardBody>
    </Card>
  );
}

function ServicesTab({ data }: { data: AppData }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {(["lighting", "water", "waste", "traffic"] as const).map((s) => (
        <Card key={s}>
          <CardBody className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-ink-100 font-bold uppercase text-ink-600">{s[0]}</span>
              <div>
                <div className="text-sm font-semibold text-ink-800">{s[0].toUpperCase() + s.slice(1)}</div>
                <div className="text-xs text-ink-400">{data.devices.filter((d) => d.service === s).length} devices</div>
              </div>
            </div>
            <Badge tone="success" dot>Enabled</Badge>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}

function MqttTab() {
  const endpoints = [
    { k: "MQTT broker", v: "mqtts://broker.citypulse.cloud:8883" },
    { k: "Topic prefix", v: "citypulse/{org}/{service}/{device}/telemetry" },
    { k: "MQTT username", v: "org_casablanca_001" },
    { k: "Protocol", v: "MQTT 3.1.1 over TLS" },
  ];
  return (
    <Card>
      <CardHeader title="MQTT / Integrations" subtitle="Device connectivity and event ingestion" />
      <CardBody className="space-y-3">
        {endpoints.map((e) => (
          <div key={e.k} className="flex items-center justify-between gap-3 border-b border-ink-50 pb-3 last:border-0">
            <div>
              <div className="text-[13px] font-semibold text-ink-800">{e.k}</div>
              <div className="font-mono text-xs text-ink-500">{e.v}</div>
            </div>
            <Badge tone={e.k === "MQTT broker" ? "success" : "neutral"} dot>{e.k === "MQTT broker" ? "Connected" : "Info"}</Badge>
          </div>
        ))}
        <div className="rounded-lg border border-pulse-100 bg-pulse-50 p-3 text-sm text-pulse-800">
          ESP32 devices connect over TLS and publish to their per-device topic. Commands are delivered on the reciprocal command channel.
        </div>
      </CardBody>
    </Card>
  );
}

function ApiTab({ copy }: { copy: (t: string) => void }) {
  const key = "cp_live_8f2a9c71d04e5b6a";
  return (
    <Card>
      <CardHeader title="API access" subtitle="Programmatic access to your CITYPULSE data" />
      <CardBody className="space-y-4">
        <div>
          <div className="mb-1.5 text-[13px] font-semibold text-ink-700">API key</div>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate rounded-lg border border-ink-100 bg-ink-50 px-3 py-2.5 text-xs text-ink-700">{key}</code>
            <Button variant="outline" onClick={() => copy(key)}><Copy className="h-4 w-4" /></Button>
          </div>
        </div>
        <div className="rounded-lg bg-ink-950 p-4 text-xs text-ink-300">
          <div className="text-[10px] font-bold uppercase tracking-widest text-pulse-300">Example</div>
          <pre className="mt-2 font-mono text-[11px]">{`GET /v1/organizations/{org}/events?limit=10`}{"\n"}{`Authorization: Bearer ${key.slice(0, 8)}…`}</pre>
        </div>
      </CardBody>
    </Card>
  );
}

function SecurityTab() {
  return (
    <Card>
      <CardHeader title="Security" subtitle="Sign-in and multi-factor settings" />
      <CardBody className="space-y-2">
        {["Two-factor authentication", "Single sign-on (SAML / OIDC)", "Session timeout", "IP allow-listing"].map((r) => (
          <label key={r} className="flex cursor-pointer items-center justify-between rounded-lg border border-ink-100 px-3 py-2.5">
            <span className="text-sm font-medium text-ink-700">{r}</span>
            <input type="checkbox" defaultChecked className="h-4 w-4 accent-pulse-600" />
          </label>
        ))}
        <div className="flex justify-end pt-2">
          <Button variant="outline" size="sm" onClick={() => (window.location.hash = "#/login")}>
            <ArrowLeft className="h-4 w-4" /> Sign out
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}


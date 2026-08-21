import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  Activity,
  BarChart3,
  Bell,
  BellRing,
  Cpu,
  Droplets,
  LayoutDashboard,
  Lightbulb,
  LogOut,
  Map as MapIcon,
  Menu,
  Plug,
  Search,
  Settings,
  Sparkles,
  Ticket,
  TrafficCone,
  Trash2,
  Users,
  X,
  CheckCheck,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/format";
import { Logo } from "@/components/ui/Logo";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LiveIndicator } from "@/components/ui/StatusDot";
import type { ServiceId } from "@/lib/types";
import { SERVICE_META } from "@/components/ui/ServiceIcon";

const SECTIONS: {
  label: string;
  items: { to: string; label: string; icon: React.ComponentType<{ className?: string }>; end?: boolean; adminOnly?: boolean }[];
}[] = [
  {
    label: "",
    items: [
      { to: "/app", label: "Overview", icon: LayoutDashboard, end: true },
      { to: "/app/map", label: "City Map", icon: MapIcon },
    ],
  },
  {
    label: "Services",
    items: [
      { to: "/app/lighting", label: "Lighting", icon: Lightbulb },
      { to: "/app/water", label: "Water", icon: Droplets },
      { to: "/app/waste", label: "Waste", icon: Trash2 },
      { to: "/app/traffic", label: "Traffic", icon: TrafficCone },
    ],
  },
  {
    label: "Operations",
    items: [
      { to: "/app/events", label: "Events", icon: Bell },
      { to: "/app/tickets", label: "Tickets", icon: Ticket },
      { to: "/app/operators", label: "Operators", icon: Users },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { to: "/app/ai-insights", label: "AI Insights", icon: Sparkles },
      { to: "/app/analytics", label: "Analytics", icon: BarChart3 },
    ],
  },
  {
    label: "System",
    items: [
      { to: "/app/devices", label: "Devices", icon: Cpu },
      { to: "/app/users", label: "Users & Roles", icon: Users, adminOnly: true },
      { to: "/app/settings", label: "Settings", icon: Settings },
    ],
  },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { user, logout, data, unreadCount } = useApp();
  const navigate = useNavigate();
  const initials = (user?.fullName ?? "YA")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");

  const eventsNew = data.events.filter((e) => e.status === "new").length;
  const ticketsOpen = data.tickets.filter((t) => t.status === "open" || t.status === "in_progress").length;

  const badgeFor = (to: string): number | undefined => {
    if (to === "/app/events") return eventsNew;
    if (to === "/app/tickets") return ticketsOpen;
    if (to === "/app/ai-insights") return data.insights.filter((i) => i.status === "new").length;
    return undefined;
  };

  return (
    <div className="flex h-full flex-col bg-ink-950 text-ink-200">
      <div className="flex h-16 items-center gap-2 border-b border-white/5 px-5">
        <Logo light />
        <div className="ml-auto lg:hidden">
          <Button variant="ghost" size="xs" className="!text-ink-300 hover:!bg-white/5" onClick={onNavigate} aria-label="Close menu">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <nav className="dark-scroll flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {SECTIONS.map((section, si) => (
          <div key={si}>
            {section.label && (
              <div className="mb-1.5 px-2.5 text-[10px] font-bold uppercase tracking-widest text-ink-500">
                {section.label}
              </div>
            )}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const badge = badgeFor(item.to);
                const Icon = item.icon;
                return (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.end}
                      onClick={onNavigate}
                      className={({ isActive }) =>
                        cn(
                          "group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors",
                          isActive
                            ? "bg-pulse-600/15 text-white ring-1 ring-inset ring-pulse-500/30"
                            : "text-ink-300 hover:bg-white/5 hover:text-white"
                        )
                      }
                    >
                      <Icon className="h-[17px] w-[17px] shrink-0 text-ink-400 group-hover:text-pulse-300" />
                      <span className="flex-1">{item.label}</span>
                      {badge !== undefined && badge > 0 && (
                        <span className="rounded-full bg-red-500/90 px-1.5 py-0.5 text-[10px] font-bold tabular text-white">
                          {badge}
                        </span>
                      )}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="space-y-2 border-t border-white/5 p-3">
        <div className="rounded-lg bg-white/5 px-3 py-2.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-ink-400">System status</span>
            <span className="inline-flex items-center gap-1 font-semibold text-live-400">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-live-400" /> Operational
            </span>
          </div>
          <div className="mt-1 text-[10px] text-ink-500">MQTT bridge · Realtime · Storage</div>
        </div>
        <button
          onClick={() => {
            logout();
            navigate("/");
          }}
          className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-white/5"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-pulse-600 text-[11px] font-bold text-white">
            {initials}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-semibold text-white">{user?.fullName ?? "User"}</span>
            <span className="block truncate text-[11px] text-ink-400">
              {user?.role ?? "admin"} · {user?.organizationType ?? "municipality"}
            </span>
          </span>
          <LogOut className="h-4 w-4 text-ink-500" />
        </button>
      </div>
    </div>
  );
}

function TopBar({ onMenu }: { onMenu: () => void }) {
  const { user, unreadCount, data, markAllNotificationsRead } = useApp();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-ink-100 bg-white/90 px-4 backdrop-blur md:px-6">
      <Button variant="ghost" size="sm" className="lg:hidden !px-2" onClick={onMenu} aria-label="Open menu">
        <Menu className="h-5 w-5" />
      </Button>

      <div className="relative hidden max-w-md flex-1 items-center md:flex">
        <Search className="pointer-events-none absolute left-3 h-4 w-4 text-ink-400" />
        <input
          placeholder="Search devices, tickets, events…"
          className="h-9 w-full rounded-lg border border-ink-100 bg-ink-50 pl-9 pr-3 text-sm text-ink-800 placeholder:text-ink-400 focus:border-pulse-300 focus:outline-none focus:ring-2 focus:ring-pulse-100"
        />
      </div>

      <div className="ml-auto flex items-center gap-2 md:ml-0">
        <LiveIndicator className="hidden sm:inline-flex" />
        <div className="h-6 w-px bg-ink-100" />

        {/* Notifications */}
        <div className="relative" ref={ref}>
          <button
            onClick={() => setOpen((v) => !v)}
            className="relative flex h-9 w-9 items-center justify-center rounded-lg text-ink-500 transition-colors hover:bg-ink-100"
            aria-label="Notifications"
          >
            <Bell className="h-[18px] w-[18px]" />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </button>
          {open && (
            <div className="absolute right-0 top-11 w-[340px] overflow-hidden rounded-xl border border-ink-100 bg-white shadow-pop">
              <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
                <span className="text-sm font-semibold text-ink-900">Notifications</span>
                <button className="inline-flex items-center gap-1 text-[11px] font-semibold text-pulse-600 hover:text-pulse-700" onClick={markAllNotificationsRead}>
                  Mark all read <CheckCheck className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {data.notifications.slice(0, 6).map((n) => (
                  <button key={n.id} className="flex w-full items-start gap-3 border-b border-ink-50 px-4 py-3 text-left transition-colors hover:bg-ink-50">
                    <span
                      className={cn(
                        "mt-1 h-2 w-2 shrink-0 rounded-full",
                        n.severity === "critical" ? "bg-red-500" : n.severity === "warning" ? "bg-amber-500" : "bg-pulse-500"
                      )}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-semibold text-ink-800">{n.title}</span>
                      <span className="block truncate text-xs text-ink-500">{n.message}</span>
                      <span className="mt-0.5 block text-[10px] text-ink-400">{timeAgo(n.ts)}</span>
                    </span>
                    {!n.read && <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-pulse-500" />}
                  </button>
                ))}
              </div>
              <div className="p-2">
                <Button variant="ghost" size="sm" className="w-full !text-pulse-600" onClick={() => { setOpen(false); navigate("/app/notifications"); }}>
                  View all notifications
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="hidden items-center gap-2.5 border-l border-ink-100 pl-3 sm:flex">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-pulse-500 to-pulse-700 text-xs font-bold text-white">
            {(user?.fullName ?? "Y E").split(" ").map((p) => p[0]).slice(0, 2).join("")}
          </span>
          <span className="hidden text-left lg:block">
            <span className="block text-[13px] font-semibold leading-tight text-ink-900">{user?.fullName ?? "Yassine El Amrani"}</span>
            <span className="block text-[11px] leading-tight text-ink-400">{user?.organization ?? "Casablanca Urban Operations"}</span>
          </span>
        </div>
      </div>
    </header>
  );
}

function MobileBottomNav() {
  const { data } = useApp();
  const items = [
    { to: "/app", label: "Overview", icon: LayoutDashboard, end: true },
    { to: "/app/map", label: "Map", icon: MapIcon },
    { to: "/app/events", label: "Events", icon: Bell, badge: data.events.filter((e) => e.status === "new").length },
    { to: "/app/tickets", label: "Tickets", icon: Ticket, badge: data.tickets.filter((t) => t.status === "open").length },
  ];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-ink-100 bg-white/95 backdrop-blur lg:hidden">
      {items.map((it) => {
        const Icon = it.icon;
        return (
          <NavLink
            key={it.to}
            to={it.to}
            end={it.end}
            className={({ isActive }) =>
              cn(
                "relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-semibold",
                isActive ? "text-pulse-600" : "text-ink-400"
              )
            }
          >
            <span className="relative">
              <Icon className="h-5 w-5" />
              {!!it.badge && it.badge > 0 && (
                <span className="absolute -right-2 -top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-bold text-white">
                  {it.badge}
                </span>
              )}
            </span>
            {it.label}
          </NavLink>
        );
      })}
    </nav>
  );
}

function Toasts() {
  const { toasts, dismissToast } = useApp();
  const tones = {
    success: "border-live-200 bg-live-50 text-live-800",
    info: "border-pulse-200 bg-pulse-50 text-pulse-800",
    warning: "border-amber-200 bg-amber-50 text-amber-800",
    critical: "border-red-200 bg-red-50 text-red-800",
  } as const;
  return (
    <div className="pointer-events-none fixed right-4 top-20 z-[60] flex w-[320px] flex-col gap-2">
      {toasts.map((t) => (
        <div key={t.id} className={cn("pointer-events-auto animate-rise-in rounded-xl border px-4 py-3 shadow-card", tones[t.severity])}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-[13px] font-bold">{t.title}</div>
              {t.message && <div className="mt-0.5 text-xs opacity-90">{t.message}</div>}
            </div>
            <button onClick={() => dismissToast(t.id)} className="opacity-50 hover:opacity-100" aria-label="Dismiss">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="min-h-screen bg-ink-50">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 lg:block">
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink-950/60 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 animate-rise-in">
            <SidebarContent onNavigate={() => setMenuOpen(false)} />
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <TopBar onMenu={() => setMenuOpen(true)} />
        <main className="px-4 pb-24 pt-6 md:px-6 lg:pb-10">
          <Outlet />
        </main>
      </div>

      <MobileBottomNav />
      <Toasts />
    </div>
  );
}
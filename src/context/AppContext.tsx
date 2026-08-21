import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  AiInsight,
  AppData,
  AppNotification,
  CityEvent,
  DeviceMode,
  Profile,
  Ticket,
} from "@/lib/types";
import { createInitialData, demoProfile } from "@/lib/mock";
import { tick, tickInsights } from "@/lib/simulate";

export interface Toast {
  id: string;
  title: string;
  message?: string;
  severity: "success" | "info" | "warning" | "critical";
}

interface AppContextValue {
  data: AppData;
  now: number;
  toasts: Toast[];
  toast: (t: Omit<Toast, "id">) => void;
  dismissToast: (id: string) => void;
  demoMode: boolean;
  user: Profile | null;
  login: (email: string) => void;
  loginAs: (role: Profile["role"]) => void;
  register: (p: {
    fullName: string;
    email: string;
    organization: string;
    orgType: Profile["organizationType"];
    role: string;
  }) => void;
  logout: () => void;
  updateProfile: (patch: Partial<Profile>) => void;
  acknowledgeEvent: (id: string) => void;
  resolveEvent: (id: string) => void;
  createTicketFromEvent: (event: CityEvent) => void;
  createTicketFromInsight: (insight: AiInsight) => void;
  toggleDeviceMode: (deviceId: string, mode: DeviceMode) => void;
  setTicketStatus: (id: string, status: Ticket["status"]) => void;
  assignTicket: (id: string, operatorId: string) => void;
  addComment: (id: string, body: string) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  acknowledgeInsight: (id: string) => void;
  actionInsight: (id: string) => void;
  unreadCount: number;
}

const AppContext = createContext<AppContextValue | null>(null);

const STORAGE_KEY = "citypulse:user";

function restoreSession(): Profile | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Profile) : null;
  } catch {
    return null;
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState(() => createInitialData());
  const [session, setSession] = useState<Profile | null>(() => restoreSession());
  const [now, setNow] = useState(Date.now());
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(300);

  const toast = useCallback((t: Omit<Toast, "id">) => {
    const id = `t-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev.slice(-3), { ...t, id }]);
    window.setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 5400);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((x) => x.id !== id));
  }, []);

  useEffect(() => {
    const iv = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(iv);
  }, []);

  const demoMode = !session;

  // Stand-in for Supabase Realtime subscriptions. This always runs while a
  // session exists (or in anonymous demo mode) so the operations platform
  // streams live data. In production, swap this for `subscribeRealtime(...)`
  // from lib/supabase.ts and the same AppData shape keeps flowing.
  useEffect(() => {
    const iv = window.setInterval(() => {
      setData((prev) => tickInsights(tick(prev)));
    }, 3500);
    return () => window.clearInterval(iv);
  }, []);

  // ----- helpers -----
  const persist = useCallback((p: Profile) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
    setSession(p);
  }, []);

  const login = useCallback(
    (email: string) => {
      persist({ ...demoProfile, email, fullName: "Yassine El Amrani" });
      toast({ title: "Signed in", message: "Welcome back, Yassine. Live telemetry resumed.", severity: "success" });
    },
    [persist, toast]
  );

  const loginAs = useCallback(
    (role: Profile["role"]) => {
      persist({ ...demoProfile, role });
      toast({ title: `Signed in as ${role}`, severity: "success", message: "Permissions applied to this session." });
    },
    [persist, toast]
  );

  const register = useCallback(
    (p: { fullName: string; email: string; organization: string; orgType: Profile["organizationType"]; role: string }) => {
      persist({ ...demoProfile, fullName: p.fullName, email: p.email, organization: p.organization, organizationType: p.orgType });
      toast({ title: "Account created", message: "Your onboarding workspace is ready.", severity: "success" });
    },
    [persist, toast]
  );

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setSession(null);
  }, []);

  const updateProfile = useCallback(
    (patch: Partial<Profile>) => {
      setSession((s) => (s ? { ...s, ...patch } : s));
      toast({ title: "Profile updated", severity: "success" });
    },
    [toast]
  );

  // ===OPERATIONS===
  const acknowledgeEvent = useCallback((id: string) => {
    setData((d) => ({
      ...d,
      events: d.events.map((e) =>
        e.id === id && e.status === "new" ? { ...e, status: "acknowledged" as const, acknowledgedAt: Date.now() } : e
      ),
    }));
  }, []);

  const resolveEvent = useCallback((id: string) => {
    setData((d) => ({
      ...d,
      events: d.events.map((e) => (e.id === id ? { ...e, status: "resolved" as const, resolvedAt: Date.now() } : e)),
    }));
  }, []);

  const createTicketFromEvent = useCallback(
    (ev: CityEvent) => {
      const prefix = { lighting: "LGT", water: "WAT", waste: "WST", traffic: "TRF" }[ev.service];
      const tid = `${prefix}-${(seq.current += 11)}`;
      const t: Ticket = {
        id: tid,
        title: ev.title,
        service: ev.service,
        priority: ev.severity === "critical" ? "critical" : "high",
        status: "open",
        deviceId: ev.deviceId,
        createdBy: "CITYPULSE AI",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        description: ev.detail,
        aiAnalysis: undefined,
        comments: [],
        timeline: [{ ts: Date.now(), label: `Ticket created from event ${ev.id}`, actor: "CITYPULSE AI" }],
        attachmentCount: 0,
      };
      setData((d) => ({ ...d, tickets: [t, ...d.tickets] }));
      toast({ title: `Ticket ${tid} created`, message: `Linked to ${ev.deviceId}.`, severity: "info" });
    },
    [toast]
  );

  const createTicketFromInsight = useCallback(
    (ins: AiInsight) => {
      const prefix = { lighting: "LGT", water: "WAT", waste: "WST", traffic: "TRF" }[ins.service];
      const tid = `${prefix}-${(seq.current += 7)}`;
      const t: Ticket = {
        id: tid,
        title: ins.title,
        service: ins.service,
        priority: ins.severity === "critical" ? "critical" : "high",
        status: "open",
        deviceId: ins.devices[0],
        createdBy: "CITYPULSE AI",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        description: ins.recommendation,
        aiAnalysis: ins.observation,
        comments: [],
        timeline: [{ ts: Date.now(), label: "Ticket created from AI insight", actor: "CITYPULSE AI" }],
        attachmentCount: 0,
      };
      setData((d) => ({
        ...d,
        tickets: [t, ...d.tickets],
        insights: d.insights.map((i) => (i.id === ins.id ? { ...i, status: "actioned" as const } : i)),
      }));
      toast({ title: `Ticket ${tid} created`, message: "From AI recommendation.", severity: "info" });
    },
    [toast]
  );

  // ===COMMANDS===
  const toggleDeviceMode = useCallback(
    (deviceId: string, mode: DeviceMode) => {
      setData((d) => ({
        ...d,
        devices: d.devices.map((x) =>
          x.id === deviceId
            ? { ...x, mode, entityStatus: mode === "NORMAL" ? ("normal" as const) : ("warning" as const) }
            : x
        ),
      }));
      toast({ title: `Command sent to ${deviceId}`, message: `Mode set to ${mode}.`, severity: "success" });
    },
    [toast]
  );

  // ===TICKET STATUS===
  const setTicketStatus = useCallback(
    (id: string, status: Ticket["status"]) => {
      const label = { open: "reopened", in_progress: "work started", resolved: "resolved", reopened: "reopened" }[status];
      setData((d) => ({
        ...d,
        tickets: d.tickets.map((t) =>
          t.id === id
            ? {
                ...t,
                status,
                updatedAt: Date.now(),
                resolution: status === "resolved" ? t.resolution ?? "Resolved and verified on site." : t.resolution,
                timeline: [...t.timeline, { ts: Date.now(), label: `Ticket ${label}`, actor: "Current user" }],
              }
            : t
        ),
      }));
      toast({ title: `${id} ${label}`, severity: "success" });
    },
    [toast]
  );

  const assignTicket = useCallback(
    (id: string, operatorId: string) => {
      setData((d) => ({
        ...d,
        tickets: d.tickets.map((t) =>
          t.id === id
            ? {
                ...t,
                operatorId,
                updatedAt: Date.now(),
                timeline: [...t.timeline, { ts: Date.now(), label: `Assigned to operator #${operatorId}`, actor: "Current user" }],
              }
            : t
        ),
      }));
      toast({ title: `${id} assigned`, severity: "success" });
    },
    [toast]
  );

  const addComment = useCallback(
    (id: string, body: string) => {
      setData((d) => ({
        ...d,
        tickets: d.tickets.map((t) =>
          t.id === id
            ? {
                ...t,
                updatedAt: Date.now(),
                comments: [...t.comments, { id: `c-${Date.now()}`, author: session?.fullName ?? "User", body, ts: Date.now() }],
              }
            : t
        ),
      }));
      toast({ title: "Comment added", severity: "success" });
    },
    [session, toast]
  );

  const markNotificationRead = useCallback((id: string) => {
    setData((d) => ({
      ...d,
      notifications: d.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
    }));
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setData((d) => ({
      ...d,
      notifications: d.notifications.map((n) => ({ ...n, read: true })),
    }));
  }, []);

  const acknowledgeInsight = useCallback((id: string) => {
    setData((d) => ({
      ...d,
      insights: d.insights.map((i) => (i.id === id ? { ...i, status: "acknowledged" as const } : i)),
    }));
  }, []);

  const actionInsight = useCallback(
    (id: string) => {
      const ins = data.insights.find((i) => i.id === id);
      if (ins) createTicketFromInsight(ins);
    },
    [data.insights, createTicketFromInsight]
  );

  const unreadCount = data.notifications.filter((n) => !n.read).length;

  const value: AppContextValue = {
    data,
    now,
    toasts,
    toast,
    dismissToast,
    demoMode,
    user: session,
    login,
    loginAs,
    register,
    logout,
    updateProfile,
    acknowledgeEvent,
    resolveEvent,
    createTicketFromEvent,
    createTicketFromInsight,
    toggleDeviceMode,
    setTicketStatus,
    assignTicket,
    addComment,
    markNotificationRead,
    markAllNotificationsRead,
    acknowledgeInsight,
    actionInsight,
    unreadCount,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
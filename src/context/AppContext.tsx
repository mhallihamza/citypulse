import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import { hasSupabase, subscribeOrgRealtime, supabase } from "@/lib/supabase";
import * as api from "@/lib/api";
import type {
  AiInsight,
  AppNotification,
  CityEvent,
  Device,
  DeviceCommand,
  LightingState,
  Location,
  Organization,
  OrgInvite,
  OrgService,
  Profile,
  ServiceId,
  TelemetrySample,
  Ticket,
  TicketPriority,
  TicketStatus,
} from "@/lib/types";
import { errMsg, isSchemaError } from "@/lib/api";

export interface Toast {
  id: string;
  title: string;
  message?: string;
  severity: "success" | "info" | "warning" | "critical";
}

interface AppContextValue {
  // ---- platform / auth ----
  booting: boolean;
  needsConfig: boolean; // no VITE_ credentials present
  authUser: User | null;
  profile: Profile | null;
  organization: Organization | null;
  services: OrgService[];
  orgId: string | null;
  isAdmin: boolean;
  loadingData: boolean;
  realtimeOnline: boolean;
  /** True when the CITYPULSE schema is not installed in the Supabase project. */
  schemaMissing: boolean;
  /** True when the signed-in user still needs to create/join an organization. */
  needsOnboarding: boolean;

  // ---- real, org-scoped data ----
  devices: Device[];
  states: Record<string, LightingState>;
  telemetry: Record<string, TelemetrySample[]>;
  events: CityEvent[];
  tickets: Ticket[];
  notifications: AppNotification[];
  insights: AiInsight[];
  commands: DeviceCommand[];
  locations: Location[];
  users: Profile[];
  invites: OrgInvite[];

  now: number;
  toasts: Toast[];
  toast: (t: Omit<Toast, "id">) => void;
  dismissToast: (id: string) => void;

  // ---- auth actions ----
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (fullName: string, email: string, password: string) => Promise<{ needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  createOrganization: (name: string) => Promise<void>;
  joinOrganization: (code: string) => Promise<void>;

  // ---- operations ----
  refreshAll: () => Promise<void>;
  createDevice: (input: api.CreateDeviceInput) => Promise<void>;
  sendCommand: (deviceId: string, command: string, payload?: Record<string, unknown>) => Promise<void>;
  acknowledgeEvent: (id: string) => Promise<void>;
  resolveEvent: (id: string) => Promise<void>;
  createTicket: (input: { title: string; service: ServiceId; priority: TicketPriority; deviceId?: string | null; description?: string }) => Promise<void>;
  setTicketStatus: (ticketId: string, status: TicketStatus) => Promise<void>;
  assignTicket: (ticketId: string, userId: string) => Promise<void>;
  addTicketComment: (ticketId: string, body: string) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  acknowledgeInsight: (id: string) => Promise<void>;
  actionInsight: (id: string) => Promise<void>;
  createInvite: (email: string, role: string) => Promise<string>;
  revokeInvite: (id: string) => Promise<void>;

  unreadCount: number;
}

const AppContext = createContext<AppContextValue | null>(null);

const REALTIME_TABLES = ["lighting_states", "events", "device_commands", "tickets", "notifications"];

export function AppProvider({ children }: { children: ReactNode }) {
  const [booting, setBooting] = useState(true);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [services, setServices] = useState<OrgService[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [realtimeOnline, setRealtimeOnline] = useState(false);
  const [schemaMissing, setSchemaMissing] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [toasts, setToasts] = useState<Toast[]>([]);

  const [devices, setDevices] = useState<Device[]>([]);
  const [states, setStates] = useState<Record<string, LightingState>>({});
  const [telemetry, setTelemetry] = useState<Record<string, TelemetrySample[]>>({});
  const [events, setEvents] = useState<CityEvent[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [insights, setInsights] = useState<AiInsight[]>([]);
  const [commands, setCommands] = useState<DeviceCommand[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [invites, setInvites] = useState<OrgInvite[]>([]);

  // Refs so realtime handlers always see fresh joins.
  const devicesRef = useRef<Device[]>([]);
  const usersRef = useRef<Profile[]>([]);
  const statesRef = useRef<Record<string, LightingState>>({});
  const eventsRef = useRef<CityEvent[]>([]);
  const ticketsRef = useRef<Ticket[]>([]);
  const notificationsRef = useRef<AppNotification[]>([]);
  const commandsRef = useRef<DeviceCommand[]>([]);

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

  useEffect(() => {
    devicesRef.current = devices;
  }, [devices]);
  useEffect(() => {
    usersRef.current = users;
  }, [users]);
  useEffect(() => {
    statesRef.current = states;
  }, [states]);
  useEffect(() => {
    eventsRef.current = events;
  }, [events]);
  useEffect(() => {
    ticketsRef.current = tickets;
  }, [tickets]);
  useEffect(() => {
    notificationsRef.current = notifications;
  }, [notifications]);
  useEffect(() => {
    commandsRef.current = commands;
  }, [commands]);
// ----------------------------------------------------------------
  // Hydration & data refresh
  // ----------------------------------------------------------------

  const orgIdRef = useRef<string | null>(null);
  useEffect(() => {
    orgIdRef.current = profile?.organizationId ?? null;
  }, [profile?.organizationId]);

  const clearOrgData = useCallback(() => {
    setProfile(null);
    setOrganization(null);
    setServices([]);
    setDevices([]);
    setStates({});
    setTelemetry({});
    setEvents([]);
    setTickets([]);
    setNotifications([]);
    setInsights([]);
    setCommands([]);
    setLocations([]);
    setUsers([]);
    setInvites([]);
    setNeedsOnboarding(false);
    setRealtimeOnline(false);
  }, []);

  const hydrateProfile = useCallback(
    async (userId: string) => {
      try {
        const p = await api.fetchProfileByUserId(userId);
        setProfile(p);
        if (p?.organizationId) {
          const [org, svcs] = await Promise.all([
            api.fetchOrganization(p.organizationId),
            api.fetchServices(p.organizationId),
          ]);
          setOrganization(org);
          setServices(svcs);
          setNeedsOnboarding(false);
        } else {
          // Authenticated but no profile row / no organization yet.
          setOrganization(null);
          setServices([]);
          setNeedsOnboarding(true);
        }
      } catch (e) {
        console.error("hydrateProfile", e);
        if (isSchemaError(e)) {
          setSchemaMissing(true);
        } else {
          toast({ title: "Could not load your profile", message: errMsg(e), severity: "critical" });
        }
      }
    },
    [toast]
  );

  const refreshAll = useCallback(async () => {
    const org = orgIdRef.current;
    if (!supabase || !org) return;
    setLoadingData(true);
    try {
      const [devs, st, evs, tks, nts, ins, cmds, locs, orgUsers, inv] = await Promise.all([
        api.fetchDevices(org),
        api.fetchLightingStates(org),
        api.fetchEvents(org),
        api.fetchTickets(org),
        api.fetchNotifications(org),
        api.fetchInsights(org),
        api.fetchCommands(org),
        api.fetchLocations(org),
        api.fetchOrgUsers(org),
        api.fetchInvites(org),
      ]);

      const tel = await api.fetchTelemetry(org, devs.map((d) => d.id));

      const commandsJoined = cmds.map((c) => ({
        ...c,
        deviceKey: devs.find((d) => d.id === c.deviceId)?.deviceKey ?? "",
        requestedByName: orgUsers.find((u) => u.id === c.requestedBy)?.fullName ?? null,
      }));
      const ticketsJoined = tks.map((t) => ({
        ...t,
        assigneeName: orgUsers.find((u) => u.id === t.assignedTo)?.fullName ?? null,
      }));

      setDevices(devs);
      setStates(Object.fromEntries(st.map((s) => [s.deviceId, s])));
      setTelemetry(tel);
      setEvents(evs);
      setTickets(ticketsJoined);
      setNotifications(nts);
      setInsights(ins);
      setCommands(commandsJoined);
      setLocations(locs);
      setUsers(orgUsers);
      setInvites(inv);
    } catch (e) {
      console.error("refreshAll", e);
      if (isSchemaError(e)) {
        setSchemaMissing(true);
      } else {
        toast({ title: "Could not load platform data", message: errMsg(e), severity: "critical" });
      }
    } finally {
      setLoadingData(false);
    }
  }, [toast]);

  // ----------------------------------------------------------------
  // Auth bootstrap
  // ----------------------------------------------------------------

  useEffect(() => {
    if (!supabase) {
      setBooting(false);
      return;
    }
    let mounted = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) return;
        setAuthUser(data.session?.user ?? null);
        if (data.session?.user) void hydrateProfile(data.session.user.id);
      })
      .finally(() => {
        if (mounted) setBooting(false);
      });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUser(session?.user ?? null);
      if (session?.user) void hydrateProfile(session.user.id);
      else clearOrgData();
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [clearOrgData, hydrateProfile]);

  useEffect(() => {
    if (!profile?.organizationId) return;
    void refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.organizationId]);
// ----------------------------------------------------------------
  // Realtime (org-safe: RLS also filters broadcast rows server-side)
  // ----------------------------------------------------------------

  const handleRealtime = useCallback(
    (table: string, row: Record<string, unknown>, event: "INSERT" | "UPDATE" | "DELETE") => {
      setRealtimeOnline(true);
      const nowMs = Date.now();

      if (table === "lighting_states") {
        const s = api.mapState(row as never);
        setStates((prev) => {
          const prevRow = prev[s.deviceId] ?? s;
          const merged = {
            ...prevRow,
            ...s,
            online: s.online || (s.lastSeen ? nowMs - s.lastSeen < 90_000 : prevRow.online),
          };
          return { ...prev, [s.deviceId]: merged };
        });
        return;
      }

      if (table === "events") {
        const ev = api.mapEvent(row as never);
        setEvents((prev) => {
          if (event === "DELETE") return prev.filter((e) => e.id !== ev.id);
          const exists = prev.some((e) => e.id === ev.id);
          return exists ? prev.map((e) => (e.id === ev.id ? ev : e)) : [ev, ...prev].slice(0, 200);
        });
        return;
      }

      if (table === "device_commands") {
        const c = api.mapCommand(row as never);
        const dev = devicesRef.current.find((d) => d.id === c.deviceId);
        const who = c.requestedBy ? usersRef.current.find((u) => u.id === c.requestedBy)?.fullName ?? null : null;
        const joined = { ...c, deviceKey: dev?.deviceKey ?? "", requestedByName: who };
        setCommands((prev) => {
          if (event === "DELETE") return prev.filter((x) => x.id !== joined.id);
          const exists = prev.some((x) => x.id === joined.id);
          return exists ? prev.map((x) => (x.id === joined.id ? joined : x)) : [joined, ...prev].slice(0, 100);
        });
        return;
      }

      if (table === "tickets") {
        const t = api.mapTicket(row as never);
        const who = t.assignedTo ? usersRef.current.find((u) => u.id === t.assignedTo)?.fullName ?? null : null;
        const joined = { ...t, assigneeName: who };
        setTickets((prev) => {
          if (event === "DELETE") return prev.filter((x) => x.id !== joined.id);
          const exists = prev.some((x) => x.id === joined.id);
          return exists ? prev.map((x) => (x.id === joined.id ? joined : x)) : [joined, ...prev].slice(0, 150);
        });
        return;
      }

      if (table === "notifications") {
        const n = api.mapNotification(row as never);
        setNotifications((prev) => {
          if (event === "DELETE") return prev.filter((x) => x.id !== n.id);
          const exists = prev.some((x) => x.id === n.id);
          return exists ? prev.map((x) => (x.id === n.id ? n : x)) : [n, ...prev].slice(0, 60);
        });
        return;
      }
    },
    []
  );

  useEffect(() => {
    if (!supabase || !profile?.organizationId) return;
    const unsub = subscribeOrgRealtime(REALTIME_TABLES, handleRealtime);
    return () => {
      unsub();
    };
  }, [profile?.organizationId, handleRealtime]);
// ----------------------------------------------------------------
  // Auth actions (real Supabase Auth)
  // ----------------------------------------------------------------

  const signIn = useCallback(
    async (email: string, password: string) => {
      if (!supabase) throw new Error("Supabase is not configured");
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast({ title: "Signed in", severity: "success", message: "Loading your workspace…" });
    },
    [toast]
  );

  const signUp = useCallback(async (fullName: string, email: string, password: string) => {
    if (!supabase) throw new Error("Supabase is not configured");
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) throw error;
    return { needsConfirmation: !data.session };
  }, []);

  const signOut = useCallback(async () => {
    if (supabase) await supabase.auth.signOut();
    clearOrgData();
  }, [clearOrgData]);

  const resetPassword = useCallback(async (email: string) => {
    if (!supabase) throw new Error("Supabase is not configured");
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
  }, []);

  const createOrganization = useCallback(
    async (name: string) => {
      await api.rpcRegisterOrganization(name);
      const u = await supabase?.auth.getUser();
      if (u?.data?.user) await hydrateProfile(u.data.user.id);
      toast({ title: "Organization created", message: `${name} is ready (Lighting service enabled).`, severity: "success" });
    },
    [hydrateProfile, toast]
  );

  const joinOrganization = useCallback(
    async (code: string) => {
      await api.rpcJoinOrganization(code);
      const u = await supabase?.auth.getUser();
      if (u?.data?.user) await hydrateProfile(u.data.user.id);
      toast({ title: "Joined organization", severity: "success" });
    },
    [hydrateProfile, toast]
  );

  // ----------------------------------------------------------------
  // Operations (every write goes through Supabase; RLS enforces tenant)
  // ----------------------------------------------------------------

  const createDevice = useCallback(
    async (input: api.CreateDeviceInput) => {
      const org = orgIdRef.current;
      if (!org) throw new Error("No organization on this account yet.");
      await api.insertDevice(org, input);
      await refreshAll();
      toast({ title: "Device registered", message: `${input.deviceKey.toUpperCase()} saved to the device registry.`, severity: "success" });
    },
    [refreshAll, toast]
  );

  const sendCommand = useCallback(
    async (deviceId: string, command: string, payload: Record<string, unknown> = {}) => {
      const org = orgIdRef.current;
      if (!org) throw new Error("No organization on this account.");
      const user = await supabase?.auth.getUser();
      await api.insertCommand(org, user?.data?.user?.id ?? null, deviceId, command, payload);
      await refreshAll();
      toast({
        title: `Command ${command} queued`,
        message: "Stored as PENDING. Fusion AI delivers it via MQTT; the UI only reflects confirmed database state.",
        severity: "info",
      });
    },
    [refreshAll, toast]
  );

  const acknowledgeEvent = useCallback(
    async (id: string) => {
      await api.updateEventStatus(id, { status: "acknowledged", acknowledged_at: new Date().toISOString() });
      const userId = authUser?.id ?? null;
      void api.insertAudit({ orgId: orgIdRef.current ?? "", actorId: userId, action: "event.acknowledged", entityType: "events", entityId: id });
    },
    [authUser]
  );

  const resolveEvent = useCallback(
    async (id: string) => {
      await api.updateEventStatus(id, { status: "resolved", resolved_at: new Date().toISOString() });
      const userId = authUser?.id ?? null;
      void api.insertAudit({ orgId: orgIdRef.current ?? "", actorId: userId, action: "event.resolved", entityType: "events", entityId: id });
      toast({ title: "Event resolved", severity: "success" });
    },
    [authUser, toast]
  );

  const ticketSeq = useRef(0);

  const createTicket = useCallback(
    async (input: { title: string; service: ServiceId; priority: TicketPriority; deviceId?: string | null; description?: string }) => {
      const org = orgIdRef.current;
      if (!supabase || !org) throw new Error("No organization on this account.");
      const prefix = { lighting: "LGT", water: "WAT", waste: "WST", traffic: "TRF" }[input.service];
      ticketSeq.current += 1;
      const ticketKey = `${prefix}-${String(ticketSeq.current).padStart(3, "0")}`;
      await api.insertTicket({
        orgId: org,
        ticketKey,
        title: input.title,
        service: input.service,
        priority: input.priority,
        deviceId: input.deviceId ?? null,
        description: input.description ?? null,
        createdBy: profile?.fullName ?? "CityPulse Operator",
      });
      await refreshAll();
      toast({ title: `Ticket ${ticketKey} created`, severity: "success" });
    },
    [profile, refreshAll, toast]
  );
const setTicketStatus = useCallback(
    async (ticketId: string, status: TicketStatus) => {
      await api.updateTicket(ticketId, { status });
      await refreshAll();
      toast({ title: `Ticket ${status.replace("_", " ")}`, severity: "success" });
    },
    [refreshAll, toast]
  );

  const assignTicket = useCallback(
    async (ticketId: string, userId: string) => {
      await api.updateTicket(ticketId, { assigned_to: userId });
      await refreshAll();
      const who = usersRef.current.find((u) => u.id === userId)?.fullName ?? "User";
      toast({ title: "Ticket assigned", message: who, severity: "success" });
    },
    [refreshAll, toast]
  );

  const addTicketComment = useCallback(
    async (ticketId: string, body: string) => {
      await api.insertTicketComment(ticketId, profile?.fullName ?? "System", body);
      toast({ title: "Comment added", severity: "success" });
    },
    [profile, toast]
  );

  const markNotificationRead = useCallback(async (id: string) => {
    await api.markNotificationRead(id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const markAllNotificationsRead = useCallback(async () => {
    await api.markAllNotificationsRead(orgIdRef.current);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const acknowledgeInsight = useCallback(
    async (id: string) => {
      await api.updateInsightStatus(id, "acknowledged");
      setInsights((prev) => prev.map((i) => (i.id === id ? { ...i, status: "acknowledged" } : i)));
    },
    []
  );

  const actionInsight = useCallback(
    async (id: string) => {
      const ins = insights.find((i) => i.id === id);
      if (!ins) return;
      await createTicket({
        title: ins.title,
        service: ins.service,
        priority: ins.severity === "critical" ? "critical" : "high",
        deviceId: null,
        description: ins.recommendation,
      });
      await api.updateInsightStatus(id, "actioned");
      setInsights((prev) => prev.map((i) => (i.id === id ? { ...i, status: "actioned" } : i)));
    },
    [createTicket, insights]
  );

  const createInvite = useCallback(
    async (email: string, role: string) => {
      const code = await api.rpcCreateInvite(email, role);
      await refreshAll();
      return code;
    },
    [refreshAll]
  );

  const revokeInvite = useCallback(
    async (id: string) => {
      await api.rpcRevokeInvite(id);
      await refreshAll();
    },
    [refreshAll]
  );

  const unreadCount = notifications.filter((n) => !n.read).length;
  const orgId = profile?.organizationId ?? null;

  const value: AppContextValue = {
    booting,
    needsConfig: !hasSupabase,
    authUser,
    profile,
    organization,
    services,
    orgId,
    isAdmin: profile?.role === "admin",
    loadingData,
    realtimeOnline,
    schemaMissing,
    needsOnboarding,
    devices,
    states,
    telemetry,
    events,
    tickets,
    notifications,
    insights,
    commands,
    locations,
    users,
    invites,
    now,
    toasts,
    toast,
    dismissToast,
    signIn,
    signUp,
    signOut,
    resetPassword,
    createOrganization,
    joinOrganization,
    refreshAll,
    createDevice,
    sendCommand,
    acknowledgeEvent,
    resolveEvent,
    createTicket,
    setTicketStatus,
    assignTicket,
    addTicketComment,
    markNotificationRead,
    markAllNotificationsRead,
    acknowledgeInsight,
    actionInsight,
    createInvite,
    revokeInvite,
    unreadCount,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
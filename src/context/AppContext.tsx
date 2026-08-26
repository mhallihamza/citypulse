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
  Operator,
  Profile,
  ServiceId,
  TelemetrySample,
  Ticket,
  TicketAssignment,
  TicketPriority,
  TicketStatus,
  TrafficState,
  WaterState,
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
  trafficStates: Record<string, TrafficState>;
  waterStates: Record<string, WaterState>;
  telemetry: Record<string, TelemetrySample[]>;
  events: CityEvent[];
  tickets: Ticket[];
  notifications: AppNotification[];
  insights: AiInsight[];
  commands: DeviceCommand[];
  locations: Location[];
  users: Profile[];
  invites: OrgInvite[];
  operators: Operator[];
  ticketAssignments: TicketAssignment[];

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
  createOperator: (input: Omit<api.NewOperatorInput, "orgId">) => Promise<void>;
  updateOperator: (operatorId: string, patch: Partial<{ name: string; role: string; email: string | null; phone: string | null; service: ServiceId | null; status: string }>) => Promise<void>;
  deleteOperator: (operatorId: string) => Promise<void>;
  assignTicketOperator: (ticketId: string, operatorId: string) => Promise<void>;
  removeTicketOperator: (assignmentId: string) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  acknowledgeInsight: (id: string) => Promise<void>;
  actionInsight: (id: string) => Promise<void>;
  createInvite: (email: string, role: string) => Promise<string>;
  revokeInvite: (id: string) => Promise<void>;

  unreadCount: number;
}

const AppContext = createContext<AppContextValue | null>(null);

const REALTIME_TABLES = ["devices", "lighting_states", "traffic_states", "water_states", "device_telemetry", "events", "device_commands", "tickets", "notifications", "operators", "ticket_assignments"];

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
  const [trafficStates, setTrafficStates] = useState<Record<string, TrafficState>>({});
  const [waterStates, setWaterStates] = useState<Record<string, WaterState>>({});
  const [telemetry, setTelemetry] = useState<Record<string, TelemetrySample[]>>({});
  const [events, setEvents] = useState<CityEvent[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [insights, setInsights] = useState<AiInsight[]>([]);
  const [commands, setCommands] = useState<DeviceCommand[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [ticketAssignments, setTicketAssignments] = useState<TicketAssignment[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [invites, setInvites] = useState<OrgInvite[]>([]);

  // Refs so realtime handlers always see fresh joins.
  const devicesRef = useRef<Device[]>([]);
  const usersRef = useRef<Profile[]>([]);
  const statesRef = useRef<Record<string, LightingState>>({});
  const trafficStatesRef = useRef<Record<string, TrafficState>>({});
  const waterStatesRef = useRef<Record<string, WaterState>>({});
  const eventsRef = useRef<CityEvent[]>([]);
  const ticketsRef = useRef<Ticket[]>([]);
  const notificationsRef = useRef<AppNotification[]>([]);
  const commandsRef = useRef<DeviceCommand[]>([]);
  const operatorsRef = useRef<Operator[]>([]);
  const assignmentsRef = useRef<TicketAssignment[]>([]);

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
    trafficStatesRef.current = trafficStates;
  }, [trafficStates]);
  useEffect(() => {
    waterStatesRef.current = waterStates;
  }, [waterStates]);
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
  useEffect(() => {
    operatorsRef.current = operators;
  }, [operators]);
  useEffect(() => {
    assignmentsRef.current = ticketAssignments;
  }, [ticketAssignments]);
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
    setTrafficStates({});
    setWaterStates({});
    setTelemetry({});
    setEvents([]);
    setTickets([]);
    setNotifications([]);
    setInsights([]);
    setCommands([]);
    setOperators([]);
    setTicketAssignments([]);
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
      const [devs, st, ts, ws, evs, tks, nts, ins, cmds, ops, asgs, locs, orgUsers, inv] = await Promise.all([
        api.fetchDevices(org),
        api.fetchLightingStates(org),
        api.fetchTrafficStates(org),
        api.fetchWaterStates(org),
        api.fetchEvents(org),
        api.fetchTickets(org),
        api.fetchNotifications(org),
        api.fetchInsights(org),
        api.fetchCommands(org),
        api.fetchOperators(org),
        api.fetchTicketAssignments(org),
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
      setTrafficStates(Object.fromEntries(ts.map((s) => [s.deviceId, s])));
      setWaterStates(Object.fromEntries(ws.map((s) => [s.deviceId, s])));
      setTelemetry(tel);
      setEvents(evs);
      setTickets(ticketsJoined);
      setNotifications(nts);
      setInsights(ins);
      setCommands(commandsJoined);
      setOperators(ops);
      setTicketAssignments(asgs);
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

      if (table === "lighting_states") {
        const s = api.mapState(row as never);
        if (event === "DELETE") {
          setStates((prev) => {
            const { [s.deviceId]: _removed, ...rest } = prev;
            return rest;
          });
        } else {
          // postgres_changes delivers the complete new row. Honor the DB values
          // (mode / online / brightness / lux / last_seen) instead of inferring
          // the connection state client-side.
          setStates((prev) => ({ ...prev, [s.deviceId]: s }));
        }
        return;
      }

      if (table === "traffic_states") {
        const s = api.mapTrafficState(row as never);
        if (event === "DELETE") {
          setTrafficStates((prev) => {
            const { [s.deviceId]: _removed, ...rest } = prev;
            return rest;
          });
        } else {
          setTrafficStates((prev) => ({ ...prev, [s.deviceId]: s }));
        }
        return;
      }

      if (table === "water_states") {
        const s = api.mapWaterState(row as never);
        if (event === "DELETE") {
          setWaterStates((prev) => {
            const { [s.deviceId]: _removed, ...rest } = prev;
            return rest;
          });
        } else {
          setWaterStates((prev) => ({ ...prev, [s.deviceId]: s }));
        }
        return;
      }

      if (table === "devices") {
        const id = (row as { id?: string }).id ?? "";
        if (event === "DELETE") {
          setDevices((prev) => prev.filter((d) => d.id !== id));
          return;
        }
        const dev = api.mapDevice(row as never, null);
        setDevices((prev) => {
          const existing = prev.find((d) => d.id === dev.id);
          // The realtime payload does not carry the joined `locations` fields, so
          // preserve the registry's existing zone/coordinates; new rows fall back
          // to mapDevice defaults until a full refresh.
          const merged = {
            ...(existing ?? dev),
            ...dev,
            zone: existing?.zone ?? dev.zone,
            district: existing?.district ?? dev.district,
            locationLabel: existing?.locationLabel ?? dev.locationLabel,
            latitude: existing?.latitude ?? dev.latitude,
            longitude: existing?.longitude ?? dev.longitude,
          };
          const exists = prev.some((d) => d.id === dev.id);
          return exists ? prev.map((d) => (d.id === dev.id ? merged : d)) : [merged, ...prev];
        });
        return;
      }

      if (table === "device_telemetry") {
        // Append-only log table — listen to INSERTs. postgres_changes delivers the
        // complete new row, so map it directly into the per-device sample list.
        if (event === "INSERT") {
          const deviceId = (row as { device_id?: string }).device_id ?? "";
          if (!deviceId) return;
          const s = api.mapTelemetry(row as never);
          setTelemetry((prev) => {
            const arr = prev[deviceId] ?? [];
            // Deduplicate by timestamp so a redelivered / race-condition INSERT
            // (initial fetch vs realtime) never appends a duplicate row.
            if (arr.some((x) => x.ts === s.ts)) return prev;
            return { ...prev, [deviceId]: [...arr, s].slice(-120) };
          });
        }
        return;
      }

      if (table === "operators") {
        const opId = (row as { id?: string }).id ?? "";
        if (event === "DELETE") {
          setOperators((prev) => prev.filter((o) => o.id !== opId));
          return;
        }
        const op = api.mapOperator(row as never);
        setOperators((prev) => {
          const exists = prev.some((o) => o.id === op.id);
          return exists ? prev.map((o) => (o.id === op.id ? { ...o, ...op } : o)) : [op, ...prev].sort((a, b) => a.name.localeCompare(b.name));
        });
        return;
      }

      if (table === "ticket_assignments") {
        const a = api.mapTicketAssignment(row as never);
        if (event === "DELETE") {
          setTicketAssignments((prev) => prev.filter((x) => x.id !== a.id));
          return;
        }
        setTicketAssignments((prev) => {
          if (prev.some((x) => x.id === a.id)) return prev;
          return [a, ...prev];
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
      options: {
        data: { full_name: fullName },
        // Send the user back to the app (login screen) after they click the
        // confirmation link. The origin must also be listed under
        // Supabase Dashboard -> Authentication -> URL Configuration -> Redirect URLs.
        emailRedirectTo: `${window.location.origin}/login`,
      },
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

  const createOperator = useCallback(
    async (input: Omit<api.NewOperatorInput, "orgId">) => {
      const org = orgIdRef.current;
      if (!org) throw new Error("No organization on this account.");
      await api.insertOperator({ ...input, orgId: org });
      await refreshAll();
      toast({ title: "Operator created", message: input.name, severity: "success" });
    },
    [refreshAll, toast]
  );

  const updateOperator = useCallback(
    async (operatorId: string, patch: Partial<{ name: string; role: string; email: string | null; phone: string | null; service: ServiceId | null; status: string }>) => {
      await api.updateOperator(operatorId, { ...patch, service: patch.service ?? null });
      await refreshAll();
      toast({ title: "Operator updated", severity: "success" });
    },
    [refreshAll, toast]
  );

  const deleteOperator = useCallback(
    async (operatorId: string) => {
      await api.deleteOperator(operatorId);
      await refreshAll();
      toast({ title: "Operator deleted", severity: "success" });
    },
    [refreshAll, toast]
  );

  const assignTicketOperator = useCallback(
    async (ticketId: string, operatorId: string) => {
      const org = orgIdRef.current;
      if (!org) throw new Error("No organization on this account.");
      await api.assignTicketOperator(org, ticketId, operatorId, profile?.fullName ?? "System");
      await refreshAll();
      const op = operatorsRef.current.find((o) => o.id === operatorId);
      toast({ title: "Operator assigned", message: op?.name, severity: "success" });
    },
    [profile, refreshAll, toast]
  );

  const removeTicketOperator = useCallback(
    async (assignmentId: string) => {
      await api.removeTicketAssignment(assignmentId);
      await refreshAll();
      toast({ title: "Operator unassigned", severity: "info" });
    },
    [refreshAll, toast]
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
    trafficStates,
    waterStates,
    telemetry,
    events,
    tickets,
    notifications,
    insights,
    commands,
    locations,
    users,
    invites,
    operators,
    ticketAssignments,
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
    createOperator,
    updateOperator,
    deleteOperator,
    assignTicketOperator,
    removeTicketOperator,
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
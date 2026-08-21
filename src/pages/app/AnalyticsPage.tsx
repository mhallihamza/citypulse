import { useMemo, useState } from "react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart,
  ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis,
} from "recharts";
import { useApp } from "@/context/AppContext";
import { PageHeader } from "@/components/ui/Card";
import { Select } from "@/components/ui/Form";
import { ChartCard, ChartTooltip } from "@/components/ui/ChartCard";
import { Tabs } from "@/components/ui/Tabs";
import type { ServiceId } from "@/lib/types";

const RANGES = ["24h", "7d", "30d", "90d"] as const;
type Range = (typeof RANGES)[number];

export function AnalyticsPage() {
  const { data } = useApp();
  const [range, setRange] = useState<Range>("7d");
  const [serviceFilter, setServiceFilter] = useState<"all" | ServiceId>("all");

  const availability = useMemo(() => {
    const labels = range === "24h" ? ["00", "04", "08", "12", "16", "20", "Now"] : ["W1", "W2", "W3", "W4", "W5", "W6"];
    return labels.map((l, i) => ({
      name: l,
      Availability: Math.max(88, +(98.2 - (labels.length - 1 - i) * 0.5 + Math.sin(i) * 0.3).toFixed(1)),
      Failures: Math.max(0, Math.round(Math.abs(Math.sin(i * 2)) * 8)),
    }));
  }, [range]);

  const eventsBySeverity = useMemo(
    () =>
      data.events.reduce<Record<string, number>>((acc, e) => {
        acc[e.severity] = (acc[e.severity] ?? 0) + 1;
        return acc;
      }, {}),
    [data.events]
  );

  const energyTrend = useMemo(() => {
    const n = range === "24h" ? 12 : 7;
    return Array.from({ length: n }, (_, i) => ({ name: `T${i + 1}`, Energy: 42000 + Math.round(Math.sin(i / 2) * 4200 + i * 180) }));
  }, [range]);

  const wasteTrend = useMemo(() => Array.from({ length: 7 }, (_, i) => ({ name: `D${i + 1}`, Collections: 40 + Math.round(Math.abs(Math.sin(i)) * 60) + i * 3 })), []);
  const trafficDensity = useMemo(() => Array.from({ length: 12 }, (_, i) => ({ name: `${i * 2}:00`, Density: Math.round(35 + Math.abs(Math.sin(i / 2)) * 45) })), []);

  return (
    <div>
      <PageHeader
        title="Analytics"
        subtitle="Historical performance and operational trends across your infrastructure."
        live
        actions={
          <>
            <Select value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value as any)} className="!w-auto">
              <option value="all">All services</option>
              <option value="lighting">Lighting</option>
              <option value="water">Water</option>
              <option value="waste">Waste</option>
              <option value="traffic">Traffic</option>
            </Select>
            <Tabs items={RANGES.map((r) => ({ id: r, label: r }))} active={range} onChange={(id) => setRange(id as Range)} />
          </>
        }
      />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { l: "Events processed", v: data.events.length.toLocaleString(), tone: "text-pulse-600" },
          { l: "Open tickets", v: data.tickets.filter((t) => t.status === "open" || t.status === "in_progress").length, tone: "text-amber-600" },
          { l: "Resolved (30d)", v: data.tickets.filter((t) => t.status === "resolved").length, tone: "text-live-600" },
          { l: "Critical events", v: data.events.filter((e) => e.severity === "critical").length, tone: "text-red-600" },
        ].map((s) => (
          <div key={s.l} className="rounded-xl border border-ink-100 bg-white p-5 shadow-card">
            <div className="text-[11px] font-bold uppercase tracking-widest text-ink-400">{s.l}</div>
            <div className={`mt-1 font-display text-3xl font-bold ${s.tone}`}>{s.v}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <ChartCard title="Infrastructure availability" subtitle={`Availability over ${range}`} height={240}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={availability} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
              <defs>
                <linearGradient id="av" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef1f6" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis domain={[85, 100]} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <RTooltip content={<ChartTooltip formatter={(v: number) => `${Number(v).toFixed(1)}%`} />} />
              <Area type="monotone" dataKey="Availability" stroke="#10B981" strokeWidth={2} fill="url(#av)" name="Availability" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Events by severity" subtitle="Distribution across the period" height={240}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={[
              { name: "Critical", Events: eventsBySeverity.critical ?? 0 },
              { name: "Warning", Events: eventsBySeverity.warning ?? 0 },
              { name: "Info", Events: eventsBySeverity.info ?? 0 },
            ]} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef1f6" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
              <RTooltip content={<ChartTooltip />} />
              <Bar dataKey="Events" fill="#246BFF" radius={[4, 4, 0, 0]} name="Events" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Energy consumption" subtitle={`Fleet consumption (kWh) · ${serviceFilter === "all" ? "all services" : serviceFilter}`} height={240}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={energyTrend} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef1f6" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <RTooltip content={<ChartTooltip formatter={(v: number) => `${v.toLocaleString()} kWh`} />} />
              <Line type="monotone" dataKey="Energy" stroke="#8B5CF6" strokeWidth={2} dot={false} name="Energy" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Waste collections" subtitle="Routes completed per day" height={240}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={wasteTrend} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef1f6" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
              <RTooltip content={<ChartTooltip />} />
              <Bar dataKey="Collections" fill="#10B981" radius={[4, 4, 0, 0]} name="Collections" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Traffic density" subtitle="City-wide (24h profile)" height={240} className="lg:col-span-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trafficDensity} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef1f6" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <RTooltip content={<ChartTooltip formatter={(v: number) => `${v}%`} />} />
              <Line type="monotone" dataKey="Density" stroke="#8B5CF6" strokeWidth={2} dot={false} name="Density" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
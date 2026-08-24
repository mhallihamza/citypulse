import { useMemo, useState } from "react";
import { Plus, Search, Trash2, Pencil } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card, CardBody, PageHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Form";
import { EmptyState, Modal } from "@/components/ui/Modal";
import { ServiceIconBadge } from "@/components/ui/ServiceIcon";
import { timeAgo } from "@/lib/format";
import { errMsg } from "@/lib/api";
import { SERVICE_IDS, type Operator, type ServiceId } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS_ONE_OPTIONS = ["available", "busy", "offline"];

const STATUS_TONE: Record<string, string> = {
  available: "bg-live-50 text-live-700 border-live-200",
  busy: "bg-amber-50 text-amber-700 border-amber-200",
  offline: "bg-slate-100 text-slate-600 border-slate-200",
};

const STATUS_DOT: Record<string, string> = {
  available: "bg-live-500",
  busy: "bg-amber-500",
  offline: "bg-slate-400",
};

function StatusPill({ status }: { status: string }) {
  const tone = STATUS_TONE[status] ?? STATUS_TONE.offline;
  const dot = STATUS_DOT[status] ?? STATUS_DOT.offline;
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize", tone)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", dot)} />
      {status}
    </span>
  );
}

/**
 * Operators — real rows from public.operators. Create/edit/delete operators
 * for the signed-in organization. Delete is blocked when the operator still
 * has ticket assignments (public.ticket_assignments.operator_id -> operators.id)
 * so assignment history is never silently destroyed by ON DELETE CASCADE.
 */
export function OperatorsPage() {
  const { operators, ticketAssignments, deleteOperator, now } = useApp();
  const [query, setQuery] = useState("");
  const [service, setService] = useState<"all" | ServiceId>("all");
  const [status, setStatus] = useState<"all" | string>("all");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Operator | null>(null);
  const [deleting, setDeleting] = useState<Operator | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return operators.filter((o) => {
      if (service !== "all" && o.service !== service) return false;
      if (status !== "all" && o.status !== status) return false;
      if (q) {
        const hay = `${o.name} ${o.email ?? ""} ${o.phone ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [operators, query, service, status]);

  const assignmentCountFor = (operatorId: string) => ticketAssignments.filter((a) => a.operatorId === operatorId).length;

  return (
    <div>
      <PageHeader
        title="Operators"
        subtitle="Field crews and work orders — real rows from public.operators."
        live
        actions={
          <Button
            size="sm"
            onClick={() => {
              setEditing(null);
              setShowForm(true);
            }}
          >
            <Plus className="h-4 w-4" /> Create operator
          </Button>
        }
      />

      <Card>
        <CardBody className="flex flex-col gap-3 border-b border-ink-100 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, email, phone…" className="!pl-9" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={service} onChange={(e) => setService(e.target.value as "all" | ServiceId)} className="!h-10 w-40">
              <option value="all">All services</option>
              {SERVICE_IDS.map((s) => (
                <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>
              ))}
            </Select>
            <Select value={status} onChange={(e) => setStatus(e.target.value)} className="!h-10 w-36">
              <option value="all">All statuses</option>
              {STATUS_ONE_OPTIONS.map((s) => (
                <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>
              ))}
            </Select>
          </div>
        </CardBody>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-ink-100 bg-ink-50/60 text-left text-[11px] uppercase tracking-widest text-ink-400">
                <th className="px-5 py-2.5 font-semibold">Operator</th>
                <th className="px-4 py-2.5 font-semibold">Contact</th>
                <th className="px-4 py-2.5 font-semibold">Service</th>
                <th className="px-4 py-2.5 font-semibold">Status</th>
                <th className="px-4 py-2.5 font-semibold">Open</th>
                <th className="px-4 py-2.5 font-semibold">Resolved</th>
                <th className="px-4 py-2.5 font-semibold">Avg (min)</th>
                <th className="px-4 py-2.5 font-semibold">Last activity</th>
                <th className="px-4 py-2.5 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-50">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9}>
                    <EmptyState
                      title="No operators found."
                      message="Create your first field operator or adjust the search/filters."
                      action={
                        <Button
                          size="sm"
                          onClick={() => {
                            setEditing(null);
                            setShowForm(true);
                          }}
                        >
                          <Plus className="h-4 w-4" /> Create operator
                        </Button>
                      }
                      className="py-12"
                    />
                  </td>
                </tr>
              )}
              {filtered.map((o) => {
                const assigned = assignmentCountFor(o.id);
                return (
                  <tr key={o.id} className="transition-colors hover:bg-ink-50/50">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink-900 text-[11px] font-bold text-white">
                          {o.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <div className="truncate text-[13px] font-semibold text-ink-800">{o.name}</div>
                          <div className="truncate text-[11px] text-ink-400">{o.role}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-600">
                      {o.email && <div className="truncate">{o.email}</div>}
                      {o.phone && <div className="truncate text-ink-400">{o.phone}</div>}
                      {!o.email && !o.phone && <span className="text-ink-400">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {o.service ? (
                        <span className="inline-flex items-center gap-2">
                          <ServiceIconBadge service={o.service} size="sm" />
                          <span className="text-xs font-medium capitalize text-ink-700">{o.service}</span>
                        </span>
                      ) : (
                        <span className="text-xs text-ink-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3"><StatusPill status={o.status} /></td>
                    <td className="px-4 py-3 text-ink-700 tabular">{o.currentTickets}</td>
                    <td className="px-4 py-3 text-ink-700 tabular">{o.resolvedTotal}</td>
                    <td className="px-4 py-3 text-ink-700 tabular">{o.avgResolutionMin}</td>
                    <td className="px-4 py-3 text-xs text-ink-500 tabular">{o.lastActivity ? timeAgo(o.lastActivity, now) : "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {assigned > 0 && (
                          <span title={`${assigned} ticket assignment${assigned === 1 ? "" : "s"}`}>
                            <Badge tone="info">
                              {assigned} assignment{assigned === 1 ? "" : "s"}
                            </Badge>
                          </span>
                        )}
                        <Button variant="ghost" size="xs" onClick={() => { setEditing(o); setShowForm(true); }}>
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </Button>
                        <Button variant="ghost" size="xs" className="!text-red-600 hover:!bg-red-50" onClick={() => setDeleting(o)}>
                          <Trash2 className="h-3.5 w-3.5" /> Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {showForm && (
        <OperatorFormModal
          operator={editing}
          onClose={() => setShowForm(false)}
          onSaved={() => setShowForm(false)}
        />
      )}

      {deleting && (
        <DeleteOperatorModal
          operator={deleting}
          assignmentCount={assignmentCountFor(deleting.id)}
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            await deleteOperator(deleting.id);
            setDeleting(null);
          }}
        />
      )}
    </div>
  );
}
function OperatorFormModal({ operator, onClose, onSaved }: { operator: Operator | null; onClose: () => void; onSaved: () => void }) {
  const { createOperator, updateOperator } = useApp();
  const [name, setName] = useState(operator?.name ?? "");
  const [role, setRole] = useState(operator?.role ?? "field_operator");
  const [email, setEmail] = useState(operator?.email ?? "");
  const [phone, setPhone] = useState(operator?.phone ?? "");
  const [service, setService] = useState<ServiceId | "">(operator?.service ?? "");
  const [status, setStatus] = useState(operator?.status ?? "available");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        name: name.trim(),
        role: role.trim() || "field_operator",
        email: email.trim() || null,
        phone: phone.trim() || null,
        service: (service || null) as ServiceId | null,
        status,
      };
      if (operator) {
        await updateOperator(operator.id, payload);
        onSaved();
      } else {
        await createOperator(payload);
        onSaved();
      }
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={operator ? `Edit operator — ${operator.name}` : "Create operator"}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button loading={saving} onClick={() => void submit()}>{operator ? "Save changes" : "Create operator"}</Button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name" className="sm:col-span-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ahmed Benali" />
        </Field>
        <Field label="Role">
          <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Lighting Technician" />
        </Field>
        <Field label="Status">
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUS_ONE_OPTIONS.map((s) => (
              <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>
            ))}
          </Select>
        </Field>
        <Field label="Service">
          <Select value={service} onChange={(e) => setService(e.target.value as ServiceId | "")}>
            <option value="">No service</option>
            {SERVICE_IDS.map((s) => (
              <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>
            ))}
          </Select>
        </Field>
        <Field label="Phone">
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+212 …" />
        </Field>
        <Field label="Email" className="sm:col-span-2">
          <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@cityops.dev" type="email" />
        </Field>
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] font-medium text-red-700 sm:col-span-2">{error}</div>
        )}
        <div className="text-[11px] text-ink-400 sm:col-span-2">
          Operator statistics (current tickets, resolved, avg resolution) come from real database records — they are not edited here.
        </div>
      </div>
    </Modal>
  );
}

function DeleteOperatorModal({ operator, assignmentCount, onClose, onConfirm }: { operator: Operator; assignmentCount: number; onClose: () => void; onConfirm: () => Promise<void> }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const blocked = assignmentCount > 0;

  return (
    <Modal
      open
      onClose={onClose}
      title={`Delete ${operator.name}?`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            variant="danger"
            loading={saving}
            disabled={blocked}
            onClick={async () => {
              setSaving(true);
              setError("");
              try {
                await onConfirm();
                onClose();
              } catch (e) {
                setError(errMsg(e));
              } finally {
                setSaving(false);
              }
            }}
          >
            Delete operator
          </Button>
        </>
      }
    >
      <div className="space-y-3 text-sm text-ink-600">
        {blocked ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-[13px] font-medium text-amber-800">
            This operator has {assignmentCount} ticket assignment{assignmentCount === 1 ? "" : "s"}.
            <br />
            Reassign or resolve the tickets before deleting the operator.
          </div>
        ) : (
          <>
            <p>
              This will permanently remove <span className="font-semibold text-ink-900">{operator.name}</span> from{" "}
              <span className="font-mono text-xs">public.operators</span>.
            </p>
            <p className="text-xs text-ink-400">
              Allowed because this operator has no ticket assignments — no assignment history would be destroyed.
            </p>
          </>
        )}
        {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] font-medium text-red-700">{error}</div>}
      </div>
    </Modal>
  );
}
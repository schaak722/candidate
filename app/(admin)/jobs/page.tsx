"use client";

import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import {
  Button,
  Card,
  Input,
  Label,
  PageHeader,
  Select,
  Table,
  Textarea,
} from "@/components/ui";

type CompanyOption = { id: string; name: string; ref_id: string };

type Job = {
  id: string;
  company_id: string;
  company_name: string;
  company_ref_id: string;
  ref_id: string | null;
  title: string;
  status: "open" | "closed" | "draft";
  created_at: string;
  updated_at: string;
};

type JobDetail = {
  id: string;
  company_id: string;
  ref_id: string | null;
  title: string;
  status: "open" | "closed" | "draft";
  location: string | null;
  basis: string | null;
  seniority: string | null;
  description: string | null;
};

type Issue = { path: (string | number)[]; message: string };

function StatusPill({ status }: { status: Job["status"] }) {
  const style =
    status === "open"
      ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
      : status === "closed"
      ? "bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200"
      : "bg-amber-50 text-amber-700 ring-1 ring-amber-200";

  const label = status === "open" ? "Open" : status === "closed" ? "Closed" : "Draft";

  return (
    <span className={["inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", style].join(" ")}> 
      {label}
    </span>
  );
}

function ModalShell({
  title,
  onClose,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
            <div className="text-sm font-semibold text-zinc-900">{title}</div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="max-h-[75vh] overflow-auto px-5 py-4">{children}</div>

          <div className="border-t border-zinc-200 bg-zinc-50 px-5 py-4">{footer}</div>
        </div>
      </div>
    </div>
  );
}

function fmtDate(v: string) {
  try {
    return new Date(v).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  } catch {
    return v;
  }
}

export default function JobsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | Job["status"]>("all");
  const [companyId, setCompanyId] = useState<string>("");

  const [companies, setCompanies] = useState<CompanyOption[]>([]);

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Actions popover via portal
  const [menu, setMenu] = useState<null | { id: string; x: number; y: number }>(null);

  // Edit modal state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editIssues, setEditIssues] = useState<Issue[]>([]);

  const [form, setForm] = useState({
    companyId: "",
    refId: "",
    title: "",
    status: "open" as Job["status"],
    location: "",
    basis: "",
    seniority: "",
    description: "",
  });

  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (search.trim()) p.set("search", search.trim());
    p.set("status", status);
    if (companyId) p.set("companyId", companyId);
    return p.toString();
  }, [search, status, companyId]);

  async function loadCompanies() {
    try {
      const res = await fetch(`/api/companies?status=all`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      const rows = (data.companies ?? []) as any[];
      setCompanies(
        rows.map((c) => ({ id: c.id, name: c.name, ref_id: c.ref_id }))
      );
    } catch {
      // ignore
    }
  }

  async function loadJobs() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/jobs?${query}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`Failed to load (${res.status})`);
      const data = await res.json();
      setJobs(data.jobs ?? []);
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCompanies();
  }, []);

  useEffect(() => {
    void loadJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, refreshKey]);

  // Close actions menu on ESC
  useEffect(() => {
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setMenu(null);
    }
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, []);

  function issueFor(field: string) {
    const found = editIssues.find((i) => i.path?.[0] === field);
    return found?.message ?? null;
  }

  async function openEdit(id: string) {
    setMenu(null);
    setEditingId(id);
    setEditLoading(true);
    setEditSaving(false);
    setEditError(null);
    setEditIssues([]);

    try {
      const res = await fetch(`/api/jobs/${id}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setEditError(data?.error || `Failed to load (${res.status})`);
        return;
      }

      const j: JobDetail = data.job;
      setForm({
        companyId: j.company_id,
        refId: j.ref_id ?? "",
        title: j.title ?? "",
        status: j.status,
        location: j.location ?? "",
        basis: j.basis ?? "",
        seniority: j.seniority ?? "",
        description: j.description ?? "",
      });
    } catch (e: any) {
      setEditError(String(e?.message ?? e));
    } finally {
      setEditLoading(false);
    }
  }

  async function saveEdit() {
    if (!editingId) return;

    setEditSaving(true);
    setEditError(null);
    setEditIssues([]);

    try {
      const res = await fetch(`/api/jobs/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: form.companyId,
          refId: form.refId,
          title: form.title,
          status: form.status,
          location: form.location,
          basis: form.basis,
          seniority: form.seniority,
          description: form.description,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 400 && data?.issues) {
          setEditIssues(data.issues);
          setEditError("Please correct the highlighted fields.");
          return;
        }
        setEditError(data?.error || `Save failed (${res.status})`);
        return;
      }

      setEditingId(null);
      setRefreshKey((v) => v + 1);
    } catch (e: any) {
      setEditError(String(e?.message ?? e));
    } finally {
      setEditSaving(false);
    }
  }

  async function onDelete(id: string) {
    setMenu(null);
    const ok = window.confirm("Delete this job? This cannot be undone.");
    if (!ok) return;

    try {
      const res = await fetch(`/api/jobs/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data?.error || `Delete failed (${res.status})`);
        return;
      }
      setRefreshKey((v) => v + 1);
    } catch (e: any) {
      alert(String(e?.message ?? e));
    }
  }

  const menuPortal =
    menu && typeof document !== "undefined"
      ? createPortal(
          <div className="fixed inset-0 z-40" onClick={() => setMenu(null)}>
            <div
              className="absolute w-44 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg"
              style={{ top: menu.y + 8, left: Math.max(8, menu.x - 176) }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-800 hover:bg-zinc-50"
                onClick={() => openEdit(menu.id)}
              >
                <Pencil className="h-4 w-4" />
                Edit
              </button>
              <button
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50"
                onClick={() => onDelete(menu.id)}
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <div className="min-h-screen">
      {menuPortal}

      <PageHeader
        title="Jobs"
        subtitle="Create, search and manage jobs linked to companies."
        right={
          <Link href="/jobs/new">
            <Button>
              <Plus className="h-4 w-4" /> New Job
            </Button>
          </Link>
        }
      />

      <div className="px-6 py-6">
        <Card>
          <div className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-1 flex-col gap-3 md:flex-row md:items-center">
              <div className="w-full md:max-w-md">
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by job title, company or Ref ID"
                />
              </div>

              <Select value={status} onChange={(e) => setStatus(e.target.value as any)}>
                <option value="all">All statuses</option>
                <option value="open">Open</option>
                <option value="closed">Closed</option>
                <option value="draft">Draft</option>
              </Select>

              <Select value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
                <option value="">All companies</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.ref_id})
                  </option>
                ))}
              </Select>
            </div>

            <div className="text-xs text-zinc-500">{loading ? "Loading..." : `${jobs.length} result(s)`}</div>
          </div>
        </Card>

        <div className="mt-4">
          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
          ) : null}

          <div className="mt-3">
            <Table>
              <thead className="bg-zinc-50 text-left text-sm font-semibold text-zinc-700">
                <tr>
                  <th className="px-4 py-3">Ref ID</th>
                  <th className="px-4 py-3">Job Title</th>
                  <th className="px-4 py-3">Company</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3 text-right" aria-label="Actions">
                    &nbsp;
                  </th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((j) => (
                  <tr key={j.id} className="border-t border-zinc-200">
                    <td className="px-4 py-3 text-sm text-zinc-700">{j.ref_id || "—"}</td>
                    <td className="px-4 py-3 text-sm font-medium text-zinc-900">{j.title}</td>
                    <td className="px-4 py-3 text-sm text-zinc-700">{j.company_name}</td>
                    <td className="px-4 py-3">
                      <StatusPill status={j.status} />
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-700">{fmtDate(j.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        className="rounded-lg px-2 py-1 text-lg leading-none text-zinc-700 hover:bg-zinc-100"
                        aria-label="Row actions"
                        title="Actions"
                        onClick={(e) => {
                          const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
                          setMenu((prev) =>
                            prev?.id === j.id ? null : { id: j.id, x: rect.right, y: rect.bottom }
                          );
                        }}
                      >
                        ⋯
                      </button>
                    </td>
                  </tr>
                ))}

                {jobs.length === 0 && !loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-sm text-zinc-500">
                      No jobs found. Click <span className="font-medium">New Job</span> to add one.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </Table>
          </div>
        </div>
      </div>

      {/* EDIT MODAL */}
      {editingId ? (
        <ModalShell
          title="Edit Job"
          onClose={() => setEditingId(null)}
          footer={
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="secondary"
                type="button"
                onClick={() => setEditingId(null)}
                disabled={editSaving}
              >
                Cancel
              </Button>
              <Button type="button" onClick={saveEdit} disabled={editSaving || editLoading}>
                {editSaving ? "Saving..." : "Save"}
              </Button>
            </div>
          }
        >
          {editError ? (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{editError}</div>
          ) : null}

          {editLoading ? (
            <div className="py-10 text-center text-sm text-zinc-600">Loading...</div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-zinc-200 bg-white p-4">
                <div className="text-sm font-semibold text-zinc-900">Job Details</div>

                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <Label>Company *</Label>
                    <Select
                      value={form.companyId}
                      onChange={(e) => setForm({ ...form, companyId: e.target.value })}
                      className={issueFor("companyId") ? "border-red-300" : ""}
                    >
                      <option value="">Select company…</option>
                      {companies.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.ref_id})
                        </option>
                      ))}
                    </Select>
                    {issueFor("companyId") ? (
                      <div className="mt-1 text-xs text-red-600">{issueFor("companyId")}</div>
                    ) : null}
                  </div>

                  <div>
                    <Label>Status</Label>
                    <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as any })}>
                      <option value="open">Open</option>
                      <option value="closed">Closed</option>
                      <option value="draft">Draft</option>
                    </Select>
                  </div>

                  <div>
                    <Label>Job Ref ID</Label>
                    <Input value={form.refId} onChange={(e) => setForm({ ...form, refId: e.target.value })} />
                  </div>

                  <div>
                    <Label>Job Title *</Label>
                    <Input
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      className={issueFor("title") ? "border-red-300" : ""}
                    />
                    {issueFor("title") ? (
                      <div className="mt-1 text-xs text-red-600">{issueFor("title")}</div>
                    ) : null}
                  </div>

                  <div>
                    <Label>Location</Label>
                    <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
                  </div>

                  <div>
                    <Label>Basis</Label>
                    <Input value={form.basis} onChange={(e) => setForm({ ...form, basis: e.target.value })} />
                  </div>

                  <div>
                    <Label>Seniority</Label>
                    <Input value={form.seniority} onChange={(e) => setForm({ ...form, seniority: e.target.value })} />
                  </div>

                  <div className="md:col-span-2">
                    <Label>Description</Label>
                    <Textarea
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      rows={6}
                      placeholder="Job description…"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </ModalShell>
      ) : null}
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { Button, Card, Input, Label, PageHeader, Select, Table } from "@/components/ui";
import { MultiSelect } from "@/components/multi-select";
import { RichTextEditor } from "@/components/rich-text-editor";
import { JOB_CATEGORIES, SALARY_BANDS, SENIORITY_OPTIONS } from "@/lib/job-options";

type CompanyOption = { id: string; name: string; ref_id: string };
type Issue = { path: (string | number)[]; message: string };

type Job = {
  id: string;
  company_id: string;
  company_name: string;
  company_ref_id: string;
  ref_id: string | null;
  title: string;
  status: "open" | "closed" | "draft";
  closing_date: string | null;
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
  closing_date: string | null;
  salary_bands: string[];
  categories: string[];
  description: string | null;
};

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
  footer?: ReactNode;
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

          {footer ? (
            <div className="border-t border-zinc-200 bg-zinc-50 px-5 py-4">{footer}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function fmtDate(v: string) {
  try {
    return new Date(v).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
  } catch {
    return v;
  }
}

function safeHtml(html: string) {
  // Minimal safety for internal admin use
  return (html || "")
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "");
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

  // View modal
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewError, setViewError] = useState<string | null>(null);
  const [viewJob, setViewJob] = useState<JobDetail | null>(null);

  // Edit modal
  const [editId, setEditId] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editIssues, setEditIssues] = useState<Issue[]>([]);
  const [editCompanyQuery, setEditCompanyQuery] = useState("");
  const [editCompanyOpen, setEditCompanyOpen] = useState(false);

  const [editForm, setEditForm] = useState({
    companyId: "",
    refId: "",
    title: "",
    status: "draft" as Job["status"],
    location: "",
    basis: "",
    seniority: "" as "" | (typeof SENIORITY_OPTIONS)[number],
    closingDate: "",
    salaryBands: [] as string[],
    categories: [] as string[],
    description: "",
  });

  function issueFor(field: string) {
    const found = editIssues.find((i) => i.path?.[0] === field);
    return found?.message ?? null;
  }

  // ✅ IMPORTANT: do NOT use useSearchParams() (requires Suspense in Next 15 during prerender).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    const s = (sp.get("status") || "").toLowerCase();
    const c = sp.get("companyId") || "";
    const q = sp.get("search") || "";

    if (q) setSearch(q);
    if (c) setCompanyId(c);
    if (s === "open" || s === "closed" || s === "draft" || s === "all") setStatus(s as any);
  }, []);

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
      setCompanies(rows.map((c) => ({ id: c.id, name: c.name, ref_id: c.ref_id })));
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

  useEffect(() => {
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setMenu(null);
    }
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, []);

  const companyChip = useMemo(() => {
    if (!companyId) return null;
    const c = companies.find((x) => x.id === companyId);
    const label = c ? `${c.name} (${c.ref_id})` : companyId;
    return (
      <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs text-zinc-700">
        <span>Company: {label}</span>
        <button
          className="rounded-full px-2 py-0.5 text-zinc-600 hover:bg-zinc-200"
          onClick={() => setCompanyId("")}
          type="button"
        >
          Clear
        </button>
      </div>
    );
  }, [companies, companyId]);

  async function openView(id: string) {
    setViewingId(id);
    setViewLoading(true);
    setViewError(null);
    setViewJob(null);

    try {
      const res = await fetch(`/api/jobs/${id}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setViewError(data?.error || `Failed to load (${res.status})`);
        return;
      }
      setViewJob(data.job);
    } catch (e: any) {
      setViewError(String(e?.message ?? e));
    } finally {
      setViewLoading(false);
    }
  }

  async function openEdit(id: string) {
    setMenu(null);
    setEditId(id);
    setEditLoading(true);
    setEditSaving(false);
    setEditError(null);
    setEditIssues([]);
    setEditCompanyOpen(false);

    try {
      const res = await fetch(`/api/jobs/${id}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setEditError(data?.error || `Failed to load (${res.status})`);
        return;
      }

      const j: JobDetail = data.job;

      setEditForm({
        companyId: j.company_id,
        refId: j.ref_id ?? "",
        title: j.title ?? "",
        status: j.status,
        location: j.location ?? "",
        basis: j.basis ?? "",
        seniority: (j.seniority as any) ?? "",
        closingDate: j.closing_date ?? "",
        salaryBands: j.salary_bands ?? [],
        categories: j.categories ?? [],
        description: j.description ?? "",
      });

      const c = companies.find((x) => x.id === j.company_id);
      setEditCompanyQuery(c ? `${c.name} (${c.ref_id})` : "");
    } catch (e: any) {
      setEditError(String(e?.message ?? e));
    } finally {
      setEditLoading(false);
    }
  }

  async function saveEdit() {
    if (!editId) return;

    setEditSaving(true);
    setEditError(null);
    setEditIssues([]);

    try {
      const res = await fetch(`/api/jobs/${editId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: editForm.companyId,
          refId: editForm.refId,
          title: editForm.title,
          status: editForm.status,
          location: editForm.location,
          basis: editForm.basis,
          seniority: editForm.seniority || undefined,
          closingDate: editForm.closingDate || "",
          salaryBands: editForm.salaryBands,
          categories: editForm.categories,
          description: editForm.description,
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

      setEditId(null);
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

  const salaryOptions = useMemo(() => SALARY_BANDS.map((s) => ({ value: s.value, label: s.label })), []);
  const categoryOptions = useMemo(() => JOB_CATEGORIES.map((c) => ({ value: c, label: c })), []);

  const editCompanyMatches = useMemo(() => {
    const q = editCompanyQuery.trim().toLowerCase();
    if (q.length < 2) return [];
    return companies
      .filter((c) => c.name.toLowerCase().includes(q) || c.ref_id.toLowerCase().includes(q))
      .slice(0, 12);
  }, [companies, editCompanyQuery]);

  function selectEditCompany(c: CompanyOption) {
    setEditForm((f) => ({ ...f, companyId: c.id }));
    setEditCompanyQuery(`${c.name} (${c.ref_id})`);
    setEditCompanyOpen(false);
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
        subtitle="Create, search and manage jobs."
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

              {companyChip}
            </div>

            <div className="text-xs text-zinc-500">
              {loading ? "Loading..." : `${jobs.length} result(s)`}
            </div>
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
                    <td className="px-4 py-3 text-sm font-medium text-zinc-900">
                      <button
                        type="button"
                        className="text-left hover:text-zinc-700"
                        onClick={() => openView(j.id)}
                      >
                        {j.title}
                      </button>
                    </td>
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

      {/* VIEW MODAL */}
      {viewingId ? (
        <ModalShell title="Job Details" onClose={() => setViewingId(null)}>
          {viewError ? (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{viewError}</div>
          ) : null}

          {viewLoading ? (
            <div className="py-10 text-center text-sm text-zinc-600">Loading...</div>
          ) : viewJob ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-zinc-200 p-4">
                <div className="text-sm font-semibold text-zinc-900">{viewJob.title}</div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-600">
                  <span className="rounded-full bg-zinc-100 px-2 py-1">Status: {viewJob.status}</span>
                  {viewJob.ref_id ? <span className="rounded-full bg-zinc-100 px-2 py-1">Ref: {viewJob.ref_id}</span> : null}
                  {viewJob.closing_date ? <span className="rounded-full bg-zinc-100 px-2 py-1">Closes: {viewJob.closing_date}</span> : null}
                  {viewJob.seniority ? <span className="rounded-full bg-zinc-100 px-2 py-1">Seniority: {viewJob.seniority}</span> : null}
                  {viewJob.basis ? <span className="rounded-full bg-zinc-100 px-2 py-1">Basis: {viewJob.basis}</span> : null}
                  {viewJob.location ? <span className="rounded-full bg-zinc-100 px-2 py-1">Location: {viewJob.location}</span> : null}
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <Label>Salary Bands</Label>
                    <div className="mt-1 text-sm text-zinc-800">
                      {viewJob.salary_bands?.length ? viewJob.salary_bands.join(", ") : "—"}
                    </div>
                  </div>
                  <div>
                    <Label>Categories</Label>
                    <div className="mt-1 text-sm text-zinc-800">
                      {viewJob.categories?.length ? viewJob.categories.join(", ") : "—"}
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <Label>Description</Label>
                  <div
                    className="prose prose-sm mt-2 max-w-none rounded-xl border border-zinc-200 bg-white p-3"
                    dangerouslySetInnerHTML={{
                      __html: safeHtml(viewJob.description || "") || "<em>No description.</em>",
                    }}
                  />
                </div>
              </div>
            </div>
          ) : null}
        </ModalShell>
      ) : null}

      {/* EDIT MODAL */}
      {editId ? (
        <ModalShell
          title="Edit Job"
          onClose={() => setEditId(null)}
          footer={
            <div className="flex items-center justify-end gap-2">
              <Button variant="secondary" type="button" onClick={() => setEditId(null)} disabled={editSaving}>
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
              <div className="rounded-xl border border-zinc-200 p-4">
                <div className="text-sm font-semibold text-zinc-900">Job Details</div>

                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                  {/* Company typeahead */}
                  <div className="md:col-span-2">
                    <Label>Company *</Label>
                    <div className="relative mt-1">
                      <Input
                        value={editCompanyQuery}
                        onChange={(e) => {
                          setEditCompanyQuery(e.target.value);
                          setEditCompanyOpen(true);
                          setEditForm((f) => ({ ...f, companyId: "" }));
                        }}
                        onFocus={() => setEditCompanyOpen(true)}
                        placeholder="Type at least 2 letters…"
                        className={issueFor("companyId") ? "border-red-300" : ""}
                      />
                      {editCompanyOpen && editCompanyMatches.length ? (
                        <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg">
                          {editCompanyMatches.map((c) => (
                            <button
                              type="button"
                              key={c.id}
                              onClick={() => selectEditCompany(c)}
                              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-zinc-800 hover:bg-zinc-50"
                            >
                              <span>{c.name}</span>
                              <span className="text-xs text-zinc-500">{c.ref_id}</span>
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    {issueFor("companyId") ? (
                      <div className="mt-1 text-xs text-red-600">{issueFor("companyId")}</div>
                    ) : null}
                  </div>

                  <div>
                    <Label>Status</Label>
                    <Select
                      value={editForm.status}
                      onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value as any }))}
                    >
                      <option value="draft">Draft</option>
                      <option value="open">Open</option>
                      <option value="closed">Closed</option>
                    </Select>
                  </div>

                  <div>
                    <Label>Closing Date</Label>
                    <Input
                      type="date"
                      value={editForm.closingDate}
                      onChange={(e) => setEditForm((f) => ({ ...f, closingDate: e.target.value }))}
                    />
                  </div>

                  <div>
                    <Label>Job Ref ID</Label>
                    <Input value={editForm.refId} onChange={(e) => setEditForm((f) => ({ ...f, refId: e.target.value }))} />
                  </div>

                  <div>
                    <Label>Job Title *</Label>
                    <Input
                      value={editForm.title}
                      onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                      className={issueFor("title") ? "border-red-300" : ""}
                    />
                    {issueFor("title") ? (
                      <div className="mt-1 text-xs text-red-600">{issueFor("title")}</div>
                    ) : null}
                  </div>

                  <div>
                    <Label>Location</Label>
                    <Input value={editForm.location} onChange={(e) => setEditForm((f) => ({ ...f, location: e.target.value }))} />
                  </div>

                  <div>
                    <Label>Basis</Label>
                    <Input value={editForm.basis} onChange={(e) => setEditForm((f) => ({ ...f, basis: e.target.value }))} />
                  </div>

                  <div>
                    <Label>Seniority</Label>
                    <Select
                      value={editForm.seniority}
                      onChange={(e) => setEditForm((f) => ({ ...f, seniority: e.target.value as any }))}
                    >
                      <option value="">Select…</option>
                      {SENIORITY_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div>
                    <MultiSelect
                      label="Salary Bands"
                      options={salaryOptions}
                      value={editForm.salaryBands}
                      onChange={(next) => setEditForm((f) => ({ ...f, salaryBands: next }))}
                      max={10}
                      searchable={false}
                      placeholder="Select salary band(s)…"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <MultiSelect
                      label="Categories *"
                      options={categoryOptions}
                      value={editForm.categories}
                      onChange={(next) => setEditForm((f) => ({ ...f, categories: next }))}
                      min={1}
                      max={3}
                      searchable
                      placeholder="Select 1–3 categories…"
                    />
                    {issueFor("categories") ? (
                      <div className="mt-1 text-xs text-red-600">{issueFor("categories")}</div>
                    ) : null}
                  </div>

                  <div className="md:col-span-2">
                    <RichTextEditor
                      label="Job Description"
                      value={editForm.description}
                      onChange={(html) => setEditForm((f) => ({ ...f, description: html }))}
                      placeholder="Write the job description…"
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

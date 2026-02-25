"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Plus, Trash2, X } from "lucide-react";
import { Button, Card, Input, Label, PageHeader, Select, Table } from "@/components/ui";

type CompanyOption = { id: string; name: string; ref_id: string };

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

  // Actions popover via portal (to avoid clipping in overflow-hidden table wrapper)
  const [menu, setMenu] = useState<null | { id: string; x: number; y: number }>(null);

  // View-only modal
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewError, setViewError] = useState<string | null>(null);
  const [viewJob, setViewJob] = useState<JobDetail | null>(null);

  // ✅ IMPORTANT: do NOT use useSearchParams() (requires Suspense in Next 15).
  // Instead, read URL params on the client only.
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

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/companies?status=all`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        const rows = (data.companies ?? []) as any[];
        setCompanies(rows.map((c) => ({ id: c.id, name: c.name, ref_id: c.ref_id })));
      } catch {
        // ignore
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
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
    })();
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
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by job title, company or Ref ID" />
              </div>

              <Select value={status} onChange={(e) => setStatus(e.target.value as any)}>
                <option value="all">All statuses</option>
                <option value="open">Open</option>
                <option value="closed">Closed</option>
                <option value="draft">Draft</option>
              </Select>

              {companyChip}
            </div>

            <div className="text-xs text-zinc-500">{loading ? "Loading..." : `${jobs.length} result(s)`}</div>
          </div>
        </Card>

        <div className="mt-4">
          {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}

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
                      <button type="button" className="text-left hover:underline" onClick={() => openView(j.id)}>
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
                          setMenu((prev) => (prev?.id === j.id ? null : { id: j.id, x: rect.right, y: rect.bottom }));
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

      {/* VIEW-ONLY MODAL */}
      {viewingId ? (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/30" onClick={() => setViewingId(null)} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
                <div className="text-sm font-semibold text-zinc-900">Job Details</div>
                <button
                  onClick={() => setViewingId(null)}
                  className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="max-h-[75vh] overflow-auto px-5 py-4">
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
                          <div className="mt-1 text-sm text-zinc-800">{viewJob.salary_bands?.length ? viewJob.salary_bands.join(", ") : "—"}</div>
                        </div>
                        <div>
                          <Label>Categories</Label>
                          <div className="mt-1 text-sm text-zinc-800">{viewJob.categories?.length ? viewJob.categories.join(", ") : "—"}</div>
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
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Pencil, Plus, X } from "lucide-react";
import { Button, Card, Input, Label, PageHeader, Select, Table, Textarea } from "@/components/ui";

type CompanyRow = {
  id: string;
  ref_id: string;
  name: string;
  description: string | null;
  industry: string | null;
  website: string | null;
  total_jobs: number;
  // we treat this as derived, even if DB has is_active
  is_active?: boolean;
};

type CompanyDetail = CompanyRow & {
  contact_first_name: string | null;
  contact_last_name: string | null;
  contact_email: string | null;
  contact_role: string | null;
  contact_phone: string | null;
};

function StatusPill({ active }: { active: boolean }) {
  const style = active
    ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
    : "bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200";
  return (
    <span className={["inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", style].join(" ")}>
      {active ? "Active" : "Inactive"}
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

export default function CompaniesPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");
  const [rows, setRows] = useState<CompanyRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Actions menu (portal)
  const [menu, setMenu] = useState<null | { id: string; x: number; y: number }>(null);

  // View modal
  const [viewId, setViewId] = useState<string | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewError, setViewError] = useState<string | null>(null);
  const [viewCompany, setViewCompany] = useState<CompanyDetail | null>(null);

  // Edit modal
  const [editId, setEditId] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [form, setForm] = useState({
    refId: "",
    name: "",
    description: "",
    industry: "",
    website: "",
    contactFirstName: "",
    contactLastName: "",
    contactEmail: "",
    contactRole: "",
    contactPhone: "",
    logoFile: null as File | null,
  });

  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (search.trim()) p.set("search", search.trim());
    p.set("status", status);
    return p.toString();
  }, [search, status]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/companies?${query}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `Failed (${res.status})`);
      setRows(data.companies ?? []);
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  useEffect(() => {
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setMenu(null);
    }
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, []);

  async function openView(id: string) {
    setMenu(null);
    setViewId(id);
    setViewLoading(true);
    setViewError(null);
    setViewCompany(null);

    try {
      const res = await fetch(`/api/companies/${id}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setViewError(data?.error || `Failed (${res.status})`);
        return;
      }
      setViewCompany(data.company);
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

    try {
      const res = await fetch(`/api/companies/${id}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setEditError(data?.error || `Failed (${res.status})`);
        return;
      }

      const c: CompanyDetail = data.company;
      setForm({
        refId: c.ref_id ?? "",
        name: c.name ?? "",
        description: c.description ?? "",
        industry: c.industry ?? "",
        website: c.website ?? "",
        contactFirstName: c.contact_first_name ?? "",
        contactLastName: c.contact_last_name ?? "",
        contactEmail: c.contact_email ?? "",
        contactRole: c.contact_role ?? "",
        contactPhone: c.contact_phone ?? "",
        logoFile: null,
      });
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

    try {
      const fd = new FormData();
      fd.set("refId", form.refId);
      fd.set("name", form.name);
      fd.set("description", form.description);
      fd.set("industry", form.industry);
      fd.set("website", form.website);

      fd.set("contactFirstName", form.contactFirstName);
      fd.set("contactLastName", form.contactLastName);
      fd.set("contactEmail", form.contactEmail);
      fd.set("contactRole", form.contactRole);
      fd.set("contactPhone", form.contactPhone);

      if (form.logoFile) fd.set("logo", form.logoFile);

      const res = await fetch(`/api/companies/${editId}`, {
        method: "PATCH",
        body: fd,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setEditError(data?.error || `Save failed (${res.status})`);
        return;
      }

      setEditId(null);
      await load();
    } catch (e: any) {
      setEditError(String(e?.message ?? e));
    } finally {
      setEditSaving(false);
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
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <div className="min-h-screen">
      {menuPortal}

      <PageHeader
        title="Companies"
        subtitle="Manage Company Profiles"
        right={
          <Link href="/companies/new">
            <Button>
              <Plus className="h-4 w-4" /> New Company
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
                  placeholder="Search companies..."
                />
              </div>

              <Select value={status} onChange={(e) => setStatus(e.target.value as any)}>
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Select>
            </div>

            <div className="text-xs text-zinc-500">{loading ? "Loading..." : `${rows.length} result(s)`}</div>
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
                  <th className="px-4 py-3">Logo</th>
                  <th className="px-4 py-3">Company Name</th>
                  <th className="px-4 py-3">Total Jobs</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right" aria-label="Actions">
                    &nbsp;
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => {
                  const active = (c.total_jobs ?? 0) > 0;
                  return (
                    <tr key={c.id} className="border-t border-zinc-200">
                      <td className="px-4 py-3 text-sm text-zinc-700">{c.ref_id}</td>
                      <td className="px-4 py-3">
                        <img
                          src={`/api/companies/${c.id}/logo`}
                          alt=""
                          className="h-8 w-8 rounded-md border border-zinc-200 bg-white object-contain p-1"
                          onError={(e) => ((e.currentTarget.style.display = "none"))}
                        />
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-zinc-900">
                        <button
                          type="button"
                          className="text-left hover:text-zinc-700"
                          onClick={() => openView(c.id)}
                        >
                          {c.name}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-700">
                        <Link
                          href={`/jobs?companyId=${c.id}&status=open`}
                          className="hover:underline"
                          title="View open jobs"
                        >
                          {c.total_jobs ?? 0}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <StatusPill active={active} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          className="rounded-lg px-2 py-1 text-lg leading-none text-zinc-700 hover:bg-zinc-100"
                          aria-label="Row actions"
                          title="Actions"
                          onClick={(e) => {
                            const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
                            setMenu((prev) => (prev?.id === c.id ? null : { id: c.id, x: rect.right, y: rect.bottom }));
                          }}
                        >
                          ⋯
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {rows.length === 0 && !loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-sm text-zinc-500">
                      No companies found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </Table>
          </div>
        </div>
      </div>

      {/* VIEW MODAL */}
      {viewId ? (
        <ModalShell title="Company Details" onClose={() => setViewId(null)}>
          {viewError ? (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{viewError}</div>
          ) : null}

          {viewLoading ? (
            <div className="py-10 text-center text-sm text-zinc-600">Loading...</div>
          ) : viewCompany ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-zinc-200 p-4">
                <div className="flex items-start gap-3">
                  <img
                    src={`/api/companies/${viewCompany.id}/logo`}
                    alt=""
                    className="h-[70px] w-[70px] rounded-xl border border-zinc-200 bg-white object-contain p-1"
                    onError={(e) => ((e.currentTarget.style.display = "none"))}
                  />
                  <div>
                    <div className="text-sm font-semibold text-zinc-900">{viewCompany.name}</div>
                    <div className="mt-1 text-xs text-zinc-600">
                      Ref: {viewCompany.ref_id} • Status: {(viewCompany.total_jobs ?? 0) > 0 ? "Active" : "Inactive"} • Open jobs:{" "}
                      {viewCompany.total_jobs ?? 0}
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <Label>Industry</Label>
                    <div className="mt-1 text-sm text-zinc-800">{viewCompany.industry || "—"}</div>
                  </div>
                  <div>
                    <Label>Website</Label>
                    <div className="mt-1 text-sm text-zinc-800">{viewCompany.website || "—"}</div>
                  </div>
                </div>

                <div className="mt-4">
                  <Label>Description</Label>
                  <div className="mt-1 whitespace-pre-wrap text-sm text-zinc-800">
                    {viewCompany.description || "—"}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-zinc-200 p-4">
                <div className="text-sm font-semibold text-zinc-900">Primary Contact</div>
                <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <Label>First Name</Label>
                    <div className="mt-1 text-sm text-zinc-800">{viewCompany.contact_first_name || "—"}</div>
                  </div>
                  <div>
                    <Label>Last Name</Label>
                    <div className="mt-1 text-sm text-zinc-800">{viewCompany.contact_last_name || "—"}</div>
                  </div>
                  <div>
                    <Label>Email</Label>
                    <div className="mt-1 text-sm text-zinc-800">{viewCompany.contact_email || "—"}</div>
                  </div>
                  <div>
                    <Label>Role</Label>
                    <div className="mt-1 text-sm text-zinc-800">{viewCompany.contact_role || "—"}</div>
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <div className="mt-1 text-sm text-zinc-800">{viewCompany.contact_phone || "—"}</div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </ModalShell>
      ) : null}

      {/* EDIT MODAL */}
      {editId ? (
        <ModalShell
          title="Edit Company"
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
                <div className="text-sm font-semibold text-zinc-900">Company</div>

                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <Label>Ref ID</Label>
                    <Input value={form.refId} onChange={(e) => setForm({ ...form, refId: e.target.value })} />
                  </div>
                  <div>
                    <Label>Company Name</Label>
                    <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Description</Label>
                    <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} />
                  </div>
                  <div>
                    <Label>Industry</Label>
                    <Input value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} />
                  </div>
                  <div>
                    <Label>Website</Label>
                    <Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
                  </div>

                  <div className="md:col-span-2">
                    <Label>Mini Logo (70x70px)</Label>
                    <div className="mt-2 flex items-center gap-3">
                      <img
                        src={`/api/companies/${editId}/logo`}
                        alt=""
                        className="h-[70px] w-[70px] rounded-xl border border-zinc-200 bg-white object-contain p-1"
                        onError={(e) => ((e.currentTarget.style.display = "none"))}
                      />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setForm({ ...form, logoFile: e.target.files?.[0] ?? null })}
                      />
                    </div>
                    <div className="mt-1 text-xs text-zinc-500">
                      Active/Inactive is derived from Open Jobs count (no checkbox).
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-zinc-200 p-4">
                <div className="text-sm font-semibold text-zinc-900">Primary Contact</div>

                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <Label>First Name</Label>
                    <Input
                      value={form.contactFirstName}
                      onChange={(e) => setForm({ ...form, contactFirstName: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Last Name</Label>
                    <Input
                      value={form.contactLastName}
                      onChange={(e) => setForm({ ...form, contactLastName: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input
                      value={form.contactEmail}
                      onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Role</Label>
                    <Input
                      value={form.contactRole}
                      onChange={(e) => setForm({ ...form, contactRole: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Contact Number</Label>
                    <Input
                      value={form.contactPhone}
                      onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
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

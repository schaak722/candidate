"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { Pencil, Plus, X } from "lucide-react";
import {
  Button,
  Card,
  Input,
  PageHeader,
  Select,
  Textarea,
  Label,
} from "@/components/ui";

type Company = {
  id: string;
  ref_id: string;
  name: string;
  is_active: boolean;
  total_jobs: number;
  has_logo: boolean;
};

type CompanyDetail = {
  id: string;
  ref_id: string;
  name: string;
  description: string | null;
  industry: string | null;
  website: string | null;
  is_active: boolean;
  total_jobs: number;
  has_logo: boolean;
  contact: {
    first_name: string;
    last_name: string;
    email: string;
    role: string | null;
    phone: string | null;
  } | null;
};

type Issue = { path: (string | number)[]; message: string };

function StatusPill({ active }: { active: boolean }) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        active
          ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
          : "bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200",
      ].join(" ")}
    >
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

          <div className="border-t border-zinc-200 bg-zinc-50 px-5 py-4">
            {footer}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CompaniesPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // row action menu
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRootRef = useRef<HTMLDivElement | null>(null);

  // edit modal
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editIssues, setEditIssues] = useState<Issue[]>([]);
  const [editLogoFile, setEditLogoFile] = useState<File | null>(null);

  const [form, setForm] = useState({
    refId: "",
    name: "",
    description: "",
    industry: "",
    website: "",
    isActive: true,

    contactFirstName: "",
    contactLastName: "",
    contactEmail: "",
    contactRole: "",
    contactPhone: "",
  });

  const [existingLogo, setExistingLogo] = useState<{
    hasLogo: boolean;
    url: string | null;
  }>({ hasLogo: false, url: null });

  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (search.trim()) p.set("search", search.trim());
    p.set("status", status);
    return p.toString();
  }, [search, status]);

  async function loadCompanies() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/companies?${query}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`Failed to load (${res.status})`);
      const data = await res.json();
      setCompanies(data.companies ?? []);
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (cancelled) return;
      await loadCompanies();
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, refreshKey]);

  // close action menu on outside click / escape
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!openMenuId) return;
      const root = menuRootRef.current;
      if (!root) return;
      if (e.target instanceof Node && root.contains(e.target)) return;
      setOpenMenuId(null);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenMenuId(null);
    }
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [openMenuId]);

  function issueFor(field: string) {
    const found = editIssues.find((i) => i.path?.[0] === field);
    return found?.message ?? null;
  }

  async function openEdit(id: string) {
    setOpenMenuId(null);
    setEditingId(id);
    setEditLoading(true);
    setEditSaving(false);
    setEditError(null);
    setEditIssues([]);
    setEditLogoFile(null);

    try {
      const res = await fetch(`/api/companies/${id}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setEditError(data?.error || `Failed to load (${res.status})`);
        return;
      }

      const c: CompanyDetail = data.company;

      setForm({
        refId: c.ref_id ?? "",
        name: c.name ?? "",
        description: c.description ?? "",
        industry: c.industry ?? "",
        website: c.website ?? "",
        isActive: !!c.is_active,
        contactFirstName: c.contact?.first_name ?? "",
        contactLastName: c.contact?.last_name ?? "",
        contactEmail: c.contact?.email ?? "",
        contactRole: c.contact?.role ?? "",
        contactPhone: c.contact?.phone ?? "",
      });

      setExistingLogo({
        hasLogo: !!c.has_logo,
        url: c.has_logo ? `/api/companies/${c.id}/logo` : null,
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
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.set(k, String(v)));
      fd.set("isActive", String(form.isActive));
      if (editLogoFile) fd.set("logo", editLogoFile);

      const res = await fetch(`/api/companies/${editingId}`, {
        method: "PATCH",
        body: fd,
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

  const editLogoPreviewUrl = useMemo(() => {
    if (editLogoFile) return URL.createObjectURL(editLogoFile);
    return existingLogo.url;
  }, [editLogoFile, existingLogo.url]);

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Companies"
        subtitle="Search, filter and manage company profiles."
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
                  placeholder="Search by company name or Ref ID"
                />
              </div>
              <div>
                <Select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                >
                  <option value="all">All</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </Select>
              </div>
            </div>
            <div className="text-xs text-zinc-500">
              {loading ? "Loading..." : `${companies.length} result(s)`}
            </div>
          </div>
        </Card>

        <div className="mt-4">
          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {/* KEY FIX:
              - overflow-x-auto so the right-most Actions column is never clipped
              - inner min-width so table layout is stable
          */}
          <div className="mt-3 rounded-xl border border-zinc-200 bg-white overflow-x-auto">
            <div ref={menuRootRef} className="min-w-[980px]">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-zinc-50 text-left text-sm font-semibold text-zinc-700">
                  <tr>
                    <th className="px-4 py-3">Ref ID</th>
                    <th className="px-4 py-3">Logo</th>
                    <th className="px-4 py-3">Company Name</th>
                    <th className="px-4 py-3">Total Jobs</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right"> </th>
                  </tr>
                </thead>
                <tbody>
                  {companies.map((c) => (
                    <tr key={c.id} className="border-t border-zinc-200">
                      <td className="px-4 py-3 text-sm text-zinc-800">
                        {c.ref_id}
                      </td>

                      <td className="px-4 py-3">
                        <div className="relative h-8 w-8 overflow-hidden rounded-md border border-zinc-200 bg-white">
                          {c.has_logo ? (
                            <Image
                              src={`/api/companies/${c.id}/logo`}
                              alt={`${c.name} logo`}
                              fill
                              className="object-contain p-0.5"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[10px] text-zinc-400">
                              —
                            </div>
                          )}
                        </div>
                      </td>

                      {/* KEY FIX: truncate company name so it doesn't push Actions off-screen */}
                      <td className="px-4 py-3 text-sm font-medium text-zinc-900 max-w-[520px] truncate">
                        {c.name}
                      </td>

                      <td className="px-4 py-3 text-sm text-zinc-700">
                        {c.total_jobs}
                      </td>

                      <td className="px-4 py-3">
                        <StatusPill active={c.is_active} />
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="relative inline-block">
                          {/* Use a literal ellipsis so it always renders */}
                          <button
                            className="rounded-lg px-2 py-1 text-zinc-700 hover:bg-zinc-100 text-lg leading-none"
                            onClick={() =>
                              setOpenMenuId((v) => (v === c.id ? null : c.id))
                            }
                            aria-label="Row actions"
                            title="Actions"
                          >
                            ⋯
                          </button>

                          {openMenuId === c.id ? (
                            <div className="absolute right-0 mt-2 w-40 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg">
                              <button
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-800 hover:bg-zinc-50"
                                onClick={() => openEdit(c.id)}
                              >
                                <Pencil className="h-4 w-4" />
                                Edit
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}

                  {companies.length === 0 && !loading ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-10 text-center text-sm text-zinc-500"
                      >
                        No companies found. Click{" "}
                        <span className="font-medium">New Company</span> to add
                        one.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* EDIT MODAL */}
      {editingId ? (
        <ModalShell
          title="Edit Company"
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
              <Button
                type="button"
                onClick={saveEdit}
                disabled={editSaving || editLoading}
              >
                {editSaving ? "Saving..." : "Save"}
              </Button>
            </div>
          }
        >
          {editError ? (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {editError}
            </div>
          ) : null}

          {editLoading ? (
            <div className="py-10 text-center text-sm text-zinc-600">
              Loading...
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-zinc-200 bg-white p-4">
                <div className="text-sm font-semibold text-zinc-900">
                  Company Details
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <Label>Ref ID *</Label>
                    <Input
                      value={form.refId}
                      onChange={(e) =>
                        setForm({ ...form, refId: e.target.value })
                      }
                      className={issueFor("refId") ? "border-red-300" : ""}
                    />
                    {issueFor("refId") ? (
                      <div className="mt-1 text-xs text-red-600">
                        {issueFor("refId")}
                      </div>
                    ) : null}
                  </div>

                  <div>
                    <Label>Company Name *</Label>
                    <Input
                      value={form.name}
                      onChange={(e) =>
                        setForm({ ...form, name: e.target.value })
                      }
                      className={issueFor("name") ? "border-red-300" : ""}
                    />
                    {issueFor("name") ? (
                      <div className="mt-1 text-xs text-red-600">
                        {issueFor("name")}
                      </div>
                    ) : null}
                  </div>

                  <div className="md:col-span-2">
                    <Label>Company Description</Label>
                    <Textarea
                      value={form.description}
                      onChange={(e) =>
                        setForm({ ...form, description: e.target.value })
                      }
                      rows={4}
                      placeholder="Short company description…"
                    />
                  </div>

                  <div>
                    <Label>Industry</Label>
                    <Input
                      value={form.industry}
                      onChange={(e) =>
                        setForm({ ...form, industry: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <Label>Website</Label>
                    <Input
                      value={form.website}
                      onChange={(e) =>
                        setForm({ ...form, website: e.target.value })
                      }
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Label>Mini Logo (70x70px)</Label>
                    <div className="mt-2 flex items-center gap-4">
                      <div className="relative h-[70px] w-[70px] overflow-hidden rounded-lg border border-zinc-200 bg-white">
                        {editLogoPreviewUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={editLogoPreviewUrl}
                            alt="Logo preview"
                            className="h-full w-full object-contain p-1"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs text-zinc-400">
                            No logo
                          </div>
                        )}
                      </div>

                      <div className="flex-1">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) =>
                            setEditLogoFile(e.target.files?.[0] ?? null)
                          }
                          className="block w-full text-sm text-zinc-700 file:mr-4 file:rounded-lg file:border file:border-zinc-300 file:bg-white file:px-4 file:py-2 file:text-sm file:font-medium file:text-zinc-900 hover:file:bg-zinc-50"
                        />
                        <div className="mt-1 text-xs text-zinc-500">
                          Uploading a file will replace the current logo.
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={form.isActive}
                        onChange={(e) =>
                          setForm({ ...form, isActive: e.target.checked })
                        }
                        className="h-4 w-4 rounded border-zinc-300"
                      />
                      <span className="text-zinc-700">Active</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-zinc-200 bg-white p-4">
                <div className="text-sm font-semibold text-zinc-900">
                  Primary Contact
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <Label>First Name *</Label>
                    <Input
                      value={form.contactFirstName}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          contactFirstName: e.target.value,
                        })
                      }
                      className={
                        issueFor("contactFirstName") ? "border-red-300" : ""
                      }
                    />
                    {issueFor("contactFirstName") ? (
                      <div className="mt-1 text-xs text-red-600">
                        {issueFor("contactFirstName")}
                      </div>
                    ) : null}
                  </div>

                  <div>
                    <Label>Last Name *</Label>
                    <Input
                      value={form.contactLastName}
                      onChange={(e) =>
                        setForm({ ...form, contactLastName: e.target.value })
                      }
                      className={
                        issueFor("contactLastName") ? "border-red-300" : ""
                      }
                    />
                    {issueFor("contactLastName") ? (
                      <div className="mt-1 text-xs text-red-600">
                        {issueFor("contactLastName")}
                      </div>
                    ) : null}
                  </div>

                  <div>
                    <Label>Email Address *</Label>
                    <Input
                      value={form.contactEmail}
                      onChange={(e) =>
                        setForm({ ...form, contactEmail: e.target.value })
                      }
                      className={
                        issueFor("contactEmail") ? "border-red-300" : ""
                      }
                    />
                    {issueFor("contactEmail") ? (
                      <div className="mt-1 text-xs text-red-600">
                        {issueFor("contactEmail")}
                      </div>
                    ) : null}
                  </div>

                  <div>
                    <Label>Role</Label>
                    <Input
                      value={form.contactRole}
                      onChange={(e) =>
                        setForm({ ...form, contactRole: e.target.value })
                      }
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Label>Contact Number</Label>
                    <Input
                      value={form.contactPhone}
                      onChange={(e) =>
                        setForm({ ...form, contactPhone: e.target.value })
                      }
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

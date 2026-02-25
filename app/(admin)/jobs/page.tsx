"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button, Card, Input, Label, PageHeader, Select } from "@/components/ui";
import { MultiSelect } from "@/components/multi-select";
import { RichTextEditor } from "@/components/rich-text-editor";
import { JOB_CATEGORIES, SALARY_BANDS, SENIORITY_OPTIONS } from "@/lib/job-options";

type CompanyOption = { id: string; name: string; ref_id: string };
type Issue = { path: (string | number)[]; message: string };

export default function NewJobPage() {
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [companyQuery, setCompanyQuery] = useState("");
  const [companyOpen, setCompanyOpen] = useState(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);

  // Layout/order matches your latest screenshot and mandatory fields (*)
  const [form, setForm] = useState({
    companyId: "",
    status: "draft" as "open" | "closed" | "draft",

    title: "",
    refId: "",
    basis: "",
    location: "",

    seniority: "" as "" | (typeof SENIORITY_OPTIONS)[number],
    salaryBands: [] as string[],

    categories: [] as string[],
    closingDate: "",

    description: "",
  });

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

  function issueFor(field: string) {
    const found = issues.find((i) => i.path?.[0] === field);
    return found?.message ?? null;
  }

  const companyMatches = useMemo(() => {
    const q = companyQuery.trim().toLowerCase();
    if (q.length < 2) return [];
    return companies
      .filter((c) => c.name.toLowerCase().includes(q) || c.ref_id.toLowerCase().includes(q))
      .slice(0, 12);
  }, [companies, companyQuery]);

  function selectCompany(c: CompanyOption) {
    setForm((f) => ({ ...f, companyId: c.id }));
    setCompanyQuery(`${c.name} (${c.ref_id})`);
    setCompanyOpen(false);
  }

  async function submit() {
    setBusy(true);
    setError(null);
    setIssues([]);

    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: form.companyId,
          status: form.status,

          title: form.title,
          refId: form.refId,
          basis: form.basis,
          location: form.location,

          seniority: form.seniority || undefined,
          salaryBands: form.salaryBands,

          categories: form.categories,
          closingDate: form.closingDate,

          description: form.description,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 400 && data?.issues) {
          setIssues(data.issues);
          setError("Please correct the highlighted fields.");
          return;
        }
        setError(data?.error || `Create failed (${res.status})`);
        return;
      }

      window.location.href = "/jobs";
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  }

  const salaryOptions = useMemo(() => SALARY_BANDS.map((s) => ({ value: s.value, label: s.label })), []);
  const categoryOptions = useMemo(() => JOB_CATEGORIES.map((c) => ({ value: c, label: c })), []);

  return (
    <div className="min-h-screen">
      <PageHeader
        title="New Job"
        subtitle="Create a job linked to a company."
        right={
          <Link href="/jobs">
            <Button variant="secondary">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
          </Link>
        }
      />

      <div className="px-6 py-6">
        <div className="max-w-4xl space-y-4">
          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
          ) : null}

          <Card>
            <div className="p-5">
              <h2 className="text-sm font-semibold text-zinc-900">Job Details</h2>

              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                {/* Row 1: Company Name* | Status */}
                <div>
                  <Label>Company Name *</Label>
                  <div className="relative mt-1">
                    <Input
                      value={companyQuery}
                      onChange={(e) => {
                        setCompanyQuery(e.target.value);
                        setCompanyOpen(true);
                        setForm((f) => ({ ...f, companyId: "" }));
                      }}
                      onFocus={() => setCompanyOpen(true)}
                      placeholder="Type at least 2 letters…"
                      className={issueFor("companyId") ? "border-red-300" : ""}
                    />
                    {companyOpen && companyMatches.length ? (
                      <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg">
                        {companyMatches.map((c) => (
                          <button
                            type="button"
                            key={c.id}
                            onClick={() => selectCompany(c)}
                            className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-zinc-800 hover:bg-zinc-50"
                          >
                            <span>{c.name}</span>
                            <span className="text-xs text-zinc-500">{c.ref_id}</span>
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  {issueFor("companyId") ? <div className="mt-1 text-xs text-red-600">{issueFor("companyId")}</div> : null}
                </div>

                <div>
                  <Label>Status</Label>
                  <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as any })}>
                    <option value="draft">Draft</option>
                    <option value="open">Open</option>
                    <option value="closed">Closed</option>
                  </Select>
                </div>

                {/* Row 2: Job Title* | Job Ref ID* */}
                <div>
                  <Label>Job Title *</Label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className={issueFor("title") ? "border-red-300" : ""}
                  />
                  {issueFor("title") ? <div className="mt-1 text-xs text-red-600">{issueFor("title")}</div> : null}
                </div>

                <div>
                  <Label>Job Ref ID *</Label>
                  <Input
                    value={form.refId}
                    onChange={(e) => setForm({ ...form, refId: e.target.value })}
                    className={issueFor("refId") ? "border-red-300" : ""}
                  />
                  {issueFor("refId") ? <div className="mt-1 text-xs text-red-600">{issueFor("refId")}</div> : null}
                </div>

                {/* Row 3: Basis* | Location */}
                <div>
                  <Label>Basis *</Label>
                  <Input
                    value={form.basis}
                    onChange={(e) => setForm({ ...form, basis: e.target.value })}
                    className={issueFor("basis") ? "border-red-300" : ""}
                    placeholder="e.g. Full-Time"
                  />
                  {issueFor("basis") ? <div className="mt-1 text-xs text-red-600">{issueFor("basis")}</div> : null}
                </div>

                <div>
                  <Label>Location</Label>
                  <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
                </div>

                {/* Row 4: Seniority | Salary Bands */}
                <div>
                  <Label>Seniority</Label>
                  <Select value={form.seniority} onChange={(e) => setForm({ ...form, seniority: e.target.value as any })}>
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
                    value={form.salaryBands}
                    onChange={(next) => setForm({ ...form, salaryBands: next })}
                    max={10}
                    searchable={false}
                    placeholder="Select salary band(s)…"
                  />
                </div>

                {/* Row 5: Categories* | Closing Date* */}
                <div>
                  <MultiSelect
                    label="Categories *"
                    options={categoryOptions}
                    value={form.categories}
                    onChange={(next) => setForm({ ...form, categories: next })}
                    min={1}
                    max={3}
                    searchable
                    placeholder="Select 1–3 categories…"
                  />
                  {issueFor("categories") ? <div className="mt-1 text-xs text-red-600">{issueFor("categories")}</div> : null}
                </div>

                <div>
                  <Label>Closing Date *</Label>
                  <Input
                    type="date"
                    value={form.closingDate}
                    onChange={(e) => setForm({ ...form, closingDate: e.target.value })}
                    className={issueFor("closingDate") ? "border-red-300" : ""}
                  />
                  {issueFor("closingDate") ? <div className="mt-1 text-xs text-red-600">{issueFor("closingDate")}</div> : null}
                </div>

                {/* Row 6: Job Description* full width */}
                <div className="md:col-span-2">
                  <RichTextEditor
                    label="Job Description *"
                    value={form.description}
                    onChange={(html) => setForm({ ...form, description: html })}
                    placeholder="Write the job description…"
                  />
                  {issueFor("description") ? <div className="mt-1 text-xs text-red-600">{issueFor("description")}</div> : null}
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-2">
                <Link href="/jobs">
                  <Button variant="secondary" type="button">
                    Cancel
                  </Button>
                </Link>
                <Button type="button" onClick={submit} disabled={busy}>
                  {busy ? "Creating..." : "Create Job"}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

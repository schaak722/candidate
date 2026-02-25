"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button, Card, Input, Label, PageHeader, Select, Textarea } from "@/components/ui";

type CompanyOption = { id: string; name: string; ref_id: string };
type Issue = { path: (string | number)[]; message: string };

export default function NewJobPage() {
  const [companies, setCompanies] = useState<CompanyOption[]>([]);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);

  const [form, setForm] = useState({
    companyId: "",
    refId: "",
    title: "",
    status: "open" as "open" | "closed" | "draft",
    location: "",
    basis: "",
    seniority: "",
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
                  <Input value={form.refId} onChange={(e) => setForm({ ...form, refId: e.target.value })} placeholder="Optional" />
                </div>

                <div>
                  <Label>Job Title *</Label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className={issueFor("title") ? "border-red-300" : ""}
                    placeholder="e.g. Senior Software Engineer"
                  />
                  {issueFor("title") ? (
                    <div className="mt-1 text-xs text-red-600">{issueFor("title")}</div>
                  ) : null}
                </div>

                <div>
                  <Label>Location</Label>
                  <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. Malta" />
                </div>

                <div>
                  <Label>Basis</Label>
                  <Input value={form.basis} onChange={(e) => setForm({ ...form, basis: e.target.value })} placeholder="e.g. Full-Time" />
                </div>

                <div>
                  <Label>Seniority</Label>
                  <Input value={form.seniority} onChange={(e) => setForm({ ...form, seniority: e.target.value })} placeholder="e.g. Senior" />
                </div>

                <div className="md:col-span-2">
                  <Label>Description</Label>
                  <Textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={8}
                    placeholder="Job description…"
                  />
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

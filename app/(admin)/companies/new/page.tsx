"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button, Card, Input, Label, PageHeader, Textarea } from "@/components/ui";

type Issue = { path: (string | number)[]; message: string };

export default function NewCompanyPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [logoFile, setLogoFile] = useState<File | null>(null);

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
  });

  const previewUrl = useMemo(() => {
    if (!logoFile) return null;
    return URL.createObjectURL(logoFile);
  }, [logoFile]);

  async function submit() {
    setBusy(true);
    setError(null);
    setIssues([]);

    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.set(k, String(v)));
      if (logoFile) fd.set("logo", logoFile);

      const res = await fetch("/api/companies", { method: "POST", body: fd });
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

      window.location.href = "/companies";
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  }

  function issueFor(field: string) {
    const found = issues.find((i) => i.path?.[0] === field);
    return found?.message ?? null;
  }

  return (
    <div className="min-h-screen">
      <PageHeader
        title="New Company"
        subtitle="Create a company profile and primary contact."
        right={
          <Link href="/companies">
            <Button variant="secondary">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
          </Link>
        }
      />

      <div className="px-6 py-6">
        <div className="max-w-4xl space-y-4">
          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <Card>
            <div className="p-5">
              <h2 className="text-sm font-semibold text-zinc-900">Company Details</h2>
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label>Ref ID *</Label>
                  <Input
                    value={form.refId}
                    onChange={(e) => setForm({ ...form, refId: e.target.value })}
                    placeholder="e.g. KMP-001"
                    className={issueFor("refId") ? "border-red-300" : ""}
                  />
                  {issueFor("refId") ? (
                    <div className="mt-1 text-xs text-red-600">{issueFor("refId")}</div>
                  ) : null}
                </div>

                <div>
                  <Label>Company Name *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Company Name"
                    className={issueFor("name") ? "border-red-300" : ""}
                  />
                  {issueFor("name") ? (
                    <div className="mt-1 text-xs text-red-600">{issueFor("name")}</div>
                  ) : null}
                </div>

                <div className="md:col-span-2">
                  <Label>Company Description</Label>
                  <Textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={4}
                    placeholder="Short company description…"
                  />
                </div>

                <div>
                  <Label>Industry</Label>
                  <Input
                    value={form.industry}
                    onChange={(e) => setForm({ ...form, industry: e.target.value })}
                    placeholder="e.g. Recruitment"
                  />
                </div>

                <div>
                  <Label>Website</Label>
                  <Input
                    value={form.website}
                    onChange={(e) => setForm({ ...form, website: e.target.value })}
                    placeholder="https://example.com"
                  />
                </div>

                <div className="md:col-span-2">
                  <Label>Mini Logo (70x70px)</Label>
                  <div className="mt-2 flex items-center gap-4">
                    <div className="relative h-[70px] w-[70px] overflow-hidden rounded-lg border border-zinc-200 bg-white">
                      {previewUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={previewUrl} alt="Logo preview" className="h-full w-full object-contain p-1" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-zinc-400">No logo</div>
                      )}
                    </div>
                    <div className="flex-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
                        className="block w-full text-sm text-zinc-700 file:mr-4 file:rounded-lg file:border file:border-zinc-300 file:bg-white file:px-4 file:py-2 file:text-sm file:font-medium file:text-zinc-900 hover:file:bg-zinc-50"
                      />
                      <div className="mt-1 text-xs text-zinc-500">
                        Stored in the database as bytes. Recommended: PNG, ~70×70.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-600">
                    Company status (Active/Inactive) is determined automatically by whether the company has any <b>Open</b> jobs.
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-5">
              <h2 className="text-sm font-semibold text-zinc-900">Primary Contact</h2>
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label>First Name *</Label>
                  <Input
                    value={form.contactFirstName}
                    onChange={(e) => setForm({ ...form, contactFirstName: e.target.value })}
                    className={issueFor("contactFirstName") ? "border-red-300" : ""}
                  />
                  {issueFor("contactFirstName") ? (
                    <div className="mt-1 text-xs text-red-600">{issueFor("contactFirstName")}</div>
                  ) : null}
                </div>

                <div>
                  <Label>Last Name *</Label>
                  <Input
                    value={form.contactLastName}
                    onChange={(e) => setForm({ ...form, contactLastName: e.target.value })}
                    className={issueFor("contactLastName") ? "border-red-300" : ""}
                  />
                  {issueFor("contactLastName") ? (
                    <div className="mt-1 text-xs text-red-600">{issueFor("contactLastName")}</div>
                  ) : null}
                </div>

                <div>
                  <Label>Email Address *</Label>
                  <Input
                    value={form.contactEmail}
                    onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                    className={issueFor("contactEmail") ? "border-red-300" : ""}
                    placeholder="name@company.com"
                  />
                  {issueFor("contactEmail") ? (
                    <div className="mt-1 text-xs text-red-600">{issueFor("contactEmail")}</div>
                  ) : null}
                </div>

                <div>
                  <Label>Role</Label>
                  <Input
                    value={form.contactRole}
                    onChange={(e) => setForm({ ...form, contactRole: e.target.value })}
                    placeholder="e.g. HR Manager"
                  />
                </div>

                <div className="md:col-span-2">
                  <Label>Contact Number</Label>
                  <Input
                    value={form.contactPhone}
                    onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                    placeholder="+356 ..."
                  />
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-2">
                <Link href="/companies">
                  <Button variant="secondary" type="button">
                    Cancel
                  </Button>
                </Link>
                <Button type="button" onClick={submit} disabled={busy}>
                  {busy ? "Creating..." : "Create Company"}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

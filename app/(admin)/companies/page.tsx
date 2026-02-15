"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Plus } from "lucide-react";
import { Button, Card, Input, PageHeader, Select, Table } from "@/components/ui";

type Company = {
  id: string;
  ref_id: string;
  name: string;
  is_active: boolean;
  total_jobs: number;
  has_logo: boolean;
};

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

export default function CompaniesPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (search.trim()) p.set("search", search.trim());
    p.set("status", status);
    return p.toString();
  }, [search, status]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/companies?${query}`, { cache: "no-store" });
        if (!res.ok) throw new Error(`Failed to load (${res.status})`);
        const data = await res.json();
        if (!cancelled) setCompanies(data.companies ?? []);
      } catch (e: any) {
        if (!cancelled) setError(String(e?.message ?? e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [query]);

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Companies"
        subtitle="Search, filter and add new company profiles."
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
                <Select value={status} onChange={(e) => setStatus(e.target.value as any)}>
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

          <div className="mt-3">
            <Table>
              <thead className="bg-zinc-50 text-left text-sm font-semibold text-zinc-700">
                <tr>
                  <th className="px-4 py-3">Ref ID</th>
                  <th className="px-4 py-3">Logo</th>
                  <th className="px-4 py-3">Company Name</th>
                  <th className="px-4 py-3">Total Jobs</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((c) => (
                  <tr key={c.id} className="border-t border-zinc-200">
                    <td className="px-4 py-3 text-sm text-zinc-700">{c.ref_id}</td>
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
                    <td className="px-4 py-3 text-sm font-medium text-zinc-900">{c.name}</td>
                    <td className="px-4 py-3 text-sm text-zinc-700">{c.total_jobs}</td>
                    <td className="px-4 py-3">
                      <StatusPill active={c.is_active} />
                    </td>
                  </tr>
                ))}
                {companies.length === 0 && !loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-sm text-zinc-500">
                      No companies found. Click{" "}
                      <span className="font-medium">New Company</span> to add one.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}

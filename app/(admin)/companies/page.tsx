"use client";

import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
  useRef,
} from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Image from "next/image";
import { Pencil, Plus, X } from "lucide-react";
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

  // Actions popover (rendered via portal so it's not clipped by Table overflow-hidden)
  const [menu, setMenu] = useState<null | { id: string; x: number; y: number }>(
    null
  );

  // Edit modal state
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

  const [existingLogoUrl, setExistingLogoUrl] = useState<string | null>(null);
  const objectUrlRef = useRef<string | null>(null);

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
    void load();
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
    setEditLogoFile(null);
    setExistingLogoUrl(null);

    // cleanup any previous preview URL
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }

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
        website: c.website

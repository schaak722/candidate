import Link from "next/link";
import Image from "next/image";
import { Building2 } from "lucide-react";

export function Sidebar() {
  return (
    <aside className="w-64 shrink-0 border-r border-zinc-200 bg-white">
      {/* Header strip to align visually with main PageHeader */}
      <div className="flex h-[76px] items-center border-b border-zinc-200 px-6">
        <div className="relative h-10 w-10 overflow-hidden rounded-lg bg-white">
          <Image
            src="/Candidate-Logo.png"
            alt="Candidate Logo"
            fill
            className="object-contain"
            priority
          />
        </div>
      </div>

      {/* Push nav down to align with the main content (search bar/card area) */}
      <nav className="px-4 pt-6">
        <Link
          href="/companies"
          className="flex items-center gap-3 rounded-xl px-3 py-3 text-base font-semibold text-zinc-900 hover:bg-zinc-100"
        >
          <Building2 className="h-5 w-5" />
          Companies
        </Link>
      </nav>
    </aside>
  );
}

export function PageHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-zinc-200 bg-white px-6 py-5 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-zinc-600">{subtitle}</p> : null}
      </div>
      {right ? <div className="flex items-center gap-2">{right}</div> : null}
    </div>
  );
}

export function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-zinc-200 bg-white shadow-sm">{children}</div>;
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={[
        "h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900",
        "placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400",
        props.className ?? "",
      ].join(" ")}
    />
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={[
        "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900",
        "placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400",
        props.className ?? "",
      ].join(" ")}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={[
        "h-10 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900",
        "focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400",
        props.className ?? "",
      ].join(" ")}
    />
  );
}

export function Button({
  variant = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary";
}) {
  const base =
    "inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium transition";
  const primary = "bg-zinc-900 text-white hover:bg-zinc-800";
  const secondary = "border border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50";
  const cls = variant === "primary" ? primary : secondary;

  return (
    <button
      {...props}
      className={[base, cls, props.className ?? ""].join(" ")}
    />
  );
}

export function Label({ children }: { children: React.ReactNode }) {
  return <label className="text-xs font-medium text-zinc-700">{children}</label>;
}

export function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  );
}

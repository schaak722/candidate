"use client";

// components/multi-select.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";

export type MultiSelectOption = { value: string; label: string };

export function MultiSelect({
  label,
  placeholder = "Select…",
  options,
  value,
  onChange,
  min = 0,
  max = 999,
  searchable = true,
}: {
  label: string;
  placeholder?: string;
  options: MultiSelectOption[];
  value: string[];
  onChange: (next: string[]) => void;
  min?: number;
  max?: number;
  searchable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const selectedLabels = useMemo(() => {
    const map = new Map(options.map((o) => [o.value, o.label]));
    return value.map((v) => map.get(v) ?? v);
  }, [options, value]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return options;
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(qq) || o.value.toLowerCase().includes(qq)
    );
  }, [options, q]);

  function toggle(v: string) {
    const exists = value.includes(v);
    if (exists) {
      const next = value.filter((x) => x !== v);
      onChange(next);
      return;
    }
    if (value.length >= max) return;
    onChange([...value, v]);
  }

  function clearOne(v: string) {
    onChange(value.filter((x) => x !== v));
  }

  const limitHint =
    max < 999 ? `(${value.length}/${max} selected)` : `(${value.length} selected)`;

  return (
    <div ref={wrapRef} className="w-full">
      <div className="text-xs font-medium text-zinc-700">{label} <span className="text-zinc-500">{limitHint}</span></div>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mt-1 flex min-h-10 w-full items-center justify-between rounded-lg border border-zinc-300 bg-white px-3 py-2 text-left text-sm text-zinc-900 hover:bg-zinc-50"
      >
        <span className={value.length ? "" : "text-zinc-400"}>
          {value.length ? selectedLabels.join(", ") : placeholder}
        </span>
        <span className="text-zinc-400">{open ? "▲" : "▼"}</span>
      </button>

      {value.length ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {value.map((v) => {
            const opt = options.find((o) => o.value === v);
            return (
              <span
                key={v}
                className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs text-zinc-700"
              >
                {opt?.label ?? v}
                <button
                  type="button"
                  onClick={() => clearOne(v)}
                  className="rounded-full p-0.5 text-zinc-500 hover:bg-zinc-200"
                  aria-label="Remove"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })}
        </div>
      ) : null}

      {open ? (
        <div className="mt-2 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg">
          {searchable ? (
            <div className="border-b border-zinc-200 p-2">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search…"
                className="h-9 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
              />
            </div>
          ) : null}

          <div className="max-h-72 overflow-auto p-2">
            {filtered.map((o) => {
              const checked = value.includes(o.value);
              const disabled = !checked && value.length >= max;
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => toggle(o.value)}
                  disabled={disabled}
                  className={[
                    "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm",
                    checked ? "bg-[#ae4b67]/10 text-zinc-900" : "text-zinc-800 hover:bg-zinc-50",
                    disabled ? "opacity-50 cursor-not-allowed" : "",
                  ].join(" ")}
                >
                  <span>{o.label}</span>
                  <span className="text-zinc-400">{checked ? "✓" : ""}</span>
                </button>
              );
            })}

            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-sm text-zinc-500">No results.</div>
            ) : null}
          </div>

          {min > 0 ? (
            <div className="border-t border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
              Minimum required: {min}. Maximum: {max}.
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

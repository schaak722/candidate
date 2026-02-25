"use client";

// components/rich-text-editor.tsx
import { useEffect, useRef } from "react";
import { Bold, Italic, Underline, List, ListOrdered } from "lucide-react";

function exec(cmd: string) {
  // Deprecated but widely supported; good enough for internal admin tooling
  document.execCommand(cmd, false);
}

export function RichTextEditor({
  label,
  value,
  onChange,
  placeholder = "Enter description…",
}: {
  label: string;
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    // Avoid resetting cursor unless the HTML actually differs
    const current = ref.current.innerHTML;
    if (current !== value) ref.current.innerHTML = value || "";
  }, [value]);

  return (
    <div>
      <div className="text-xs font-medium text-zinc-700">{label}</div>

      <div className="mt-1 overflow-hidden rounded-xl border border-zinc-300 bg-white">
        <div className="flex items-center gap-1 border-b border-zinc-200 bg-zinc-50 p-2">
          <button
            type="button"
            onClick={() => exec("bold")}
            className="rounded-lg p-2 text-zinc-700 hover:bg-white"
            aria-label="Bold"
          >
            <Bold className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => exec("italic")}
            className="rounded-lg p-2 text-zinc-700 hover:bg-white"
            aria-label="Italic"
          >
            <Italic className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => exec("underline")}
            className="rounded-lg p-2 text-zinc-700 hover:bg-white"
            aria-label="Underline"
          >
            <Underline className="h-4 w-4" />
          </button>
          <div className="mx-1 h-6 w-px bg-zinc-200" />
          <button
            type="button"
            onClick={() => exec("insertUnorderedList")}
            className="rounded-lg p-2 text-zinc-700 hover:bg-white"
            aria-label="Bullet list"
          >
            <List className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => exec("insertOrderedList")}
            className="rounded-lg p-2 text-zinc-700 hover:bg-white"
            aria-label="Numbered list"
          >
            <ListOrdered className="h-4 w-4" />
          </button>
        </div>

        <div
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          onInput={(e) => onChange((e.target as HTMLDivElement).innerHTML)}
          className="min-h-[160px] px-3 py-2 text-sm text-zinc-900 focus:outline-none"
          data-placeholder={placeholder}
        />
      </div>

      <style jsx>{`
        [contenteditable][data-placeholder]:empty:before {
          content: attr(data-placeholder);
          color: #a1a1aa;
        }
      `}</style>
    </div>
  );
}

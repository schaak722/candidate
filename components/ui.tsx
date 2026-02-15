export function Sidebar() {
  return (
    <aside className="w-64 shrink-0 border-r border-zinc-200 bg-white">
      {/* Make this match PageHeader height so the border aligns with the main header border */}
      <div className="flex flex-col gap-3 border-b border-zinc-200 bg-white px-6 py-5">
        <div className="relative h-[52px] w-full">
          <Image
            src="/Candidate-Logo.png"
            alt="Candidate Logo"
            fill
            className="object-contain object-left"
            priority
          />
        </div>
      </div>

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
  children,
  variant = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" }) {
  const base =
    "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50";
  const styles =
    variant === "secondary"
      ? "border border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50"
      : "bg-zinc-900 text-white hover:bg-zinc-800";

  return (
    <button {...props} className={[base, styles, props.className ?? ""].join(" ")}>
      {children}
    </button>
  );
}

export function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  );
}

export function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-xs font-medium text-zinc-700">{children}</div>;
}

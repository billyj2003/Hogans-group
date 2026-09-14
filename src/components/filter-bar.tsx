import Link from "next/link";

type Option = { value: string; label: string };

type Props = {
  basePath: string;
  q?: string;
  status?: string;
  category?: string;
  from?: string;
  to?: string;
  statusOptions: Option[];
  categoryOptions: Option[];
  searchLabel: string;
};

function hrefWithout(
  basePath: string,
  params: Record<string, string | undefined>,
  omitKeys: string[],
) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v && !omitKeys.includes(k)) p.set(k, v);
  }
  const qs = p.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function FilterBar({
  basePath,
  q,
  status,
  category,
  from,
  to,
  statusOptions,
  categoryOptions,
  searchLabel,
}: Props) {
  const params = { q, status, category, from, to };
  const hasFilters = Boolean(q || status || category || from || to);
  const statusLabel = statusOptions.find((o) => o.value === status)?.label;
  const categoryLabelValue = categoryOptions.find((o) => o.value === category)?.label;

  const chips: { key: string; label: string; omit: string[] }[] = [];
  if (q) chips.push({ key: "q", label: `Search: "${q}"`, omit: ["q"] });
  if (status) chips.push({ key: "status", label: `Status: ${statusLabel}`, omit: ["status"] });
  if (category)
    chips.push({ key: "category", label: `Category: ${categoryLabelValue}`, omit: ["category"] });
  if (from || to)
    chips.push({
      key: "date",
      label: `Delivery: ${from ?? "…"} – ${to ?? "…"}`,
      omit: ["from", "to"],
    });

  return (
    <div className="mt-4">
      {chips.length > 0 && (
        <div className="mb-2 flex flex-wrap items-center gap-2">
          {chips.map((c) => (
            <Link
              key={c.key}
              href={hrefWithout(basePath, params, c.omit)}
              className="flex items-center gap-1.5 rounded-full border border-orange-500 bg-orange-500/10 px-3 py-1 text-xs font-medium text-orange-700 hover:bg-orange-500/20"
            >
              {c.label}
              <span aria-hidden>&times;</span>
            </Link>
          ))}
          <Link href={basePath} className="text-xs text-graphite-900/50 underline">
            Reset all
          </Link>
        </div>
      )}

      <details className="rounded-lg border border-graphite-950/10 bg-white p-4 [&_summary::-webkit-details-marker]:hidden">
        <summary className="cursor-pointer list-none text-sm font-medium text-graphite-900">
          {hasFilters ? "Edit filters" : "Add filters +"}
        </summary>
        <form method="get" className="mt-4 flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-medium text-graphite-900/60">{searchLabel}</label>
            <input
              name="q"
              defaultValue={q}
              className="mt-1 w-full rounded border border-graphite-950/15 px-3 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-graphite-900/60">Status</label>
            <select
              name="status"
              defaultValue={status ?? ""}
              className="mt-1 rounded border border-graphite-950/15 px-3 py-1.5 text-sm"
            >
              <option value="">Any</option>
              {statusOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-graphite-900/60">Category</label>
            <select
              name="category"
              defaultValue={category ?? ""}
              className="mt-1 rounded border border-graphite-950/15 px-3 py-1.5 text-sm"
            >
              <option value="">Any</option>
              {categoryOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-graphite-900/60">Expected from</label>
            <input
              type="date"
              name="from"
              defaultValue={from}
              className="mt-1 rounded border border-graphite-950/15 px-3 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-graphite-900/60">Expected to</label>
            <input
              type="date"
              name="to"
              defaultValue={to}
              className="mt-1 rounded border border-graphite-950/15 px-3 py-1.5 text-sm"
            />
          </div>
          <button
            type="submit"
            className="rounded bg-graphite-950 px-4 py-1.5 text-sm font-medium text-concrete-100 hover:bg-graphite-800"
          >
            Apply
          </button>
        </form>
      </details>
    </div>
  );
}

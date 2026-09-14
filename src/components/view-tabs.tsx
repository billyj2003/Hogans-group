import Link from "next/link";

export function ViewTabs({
  basePath,
  view,
  otherParams,
  jobsLabel = "Jobs",
  wagonsLabel = "Wagons",
}: {
  basePath: string;
  view: "jobs" | "wagons";
  otherParams: Record<string, string | undefined>;
  jobsLabel?: string;
  wagonsLabel?: string;
}) {
  const hrefFor = (v: "jobs" | "wagons") => {
    const p = new URLSearchParams();
    for (const [k, val] of Object.entries(otherParams)) {
      // "status" uses a different vocabulary for jobs vs. wagons, so it
      // doesn't carry over between tabs — everything else does.
      if (val && k !== "status") p.set(k, val);
    }
    if (v === "wagons") p.set("view", "wagons");
    const qs = p.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  const tabClass = (active: boolean) =>
    `flex-1 px-4 py-2 text-center text-sm font-medium transition ${
      active
        ? "bg-graphite-950 text-concrete-100"
        : "bg-white text-graphite-900 hover:bg-concrete-100"
    }`;

  return (
    <div className="mt-6 flex overflow-hidden rounded-lg border border-graphite-950/15">
      <Link href={hrefFor("jobs")} className={tabClass(view === "jobs")}>
        {jobsLabel}
      </Link>
      <Link href={hrefFor("wagons")} className={tabClass(view === "wagons")}>
        {wagonsLabel}
      </Link>
    </div>
  );
}

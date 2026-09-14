export function HoganLogo({
  light = false,
  className = "",
}: {
  light?: boolean;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg viewBox="0 0 40 40" className="h-[1.5em] w-[1.5em] shrink-0" aria-hidden>
        <circle cx="20" cy="20" r="20" fill="#e5590c" />
        <rect x="11" y="9" width="5.5" height="22" rx="0.5" fill="white" />
        <rect x="23.5" y="9" width="5.5" height="22" rx="0.5" fill="white" />
        <rect x="11" y="17.25" width="18" height="5.5" fill="white" />
      </svg>
      <span
        className={`font-display text-[1.05em] font-extrabold tracking-tight ${
          light ? "text-concrete-100" : "text-graphite-950"
        }`}
      >
        HOGAN
      </span>
    </span>
  );
}

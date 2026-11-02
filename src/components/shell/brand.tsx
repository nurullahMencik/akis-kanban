export function BrandMark({ className = "size-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="9" fill="var(--accent)" />
      <path d="M8.5 11h8" stroke="var(--on-accent)" strokeWidth="3" strokeLinecap="round" />
      <path d="M12.5 16h11" stroke="var(--on-accent)" strokeWidth="3" strokeLinecap="round" opacity="0.85" />
      <path d="M17.5 21h6" stroke="var(--on-accent)" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
    </svg>
  );
}

export function Brand({ tagline }: { tagline?: string }) {
  return (
    <span className="flex items-center gap-2.5">
      <BrandMark />
      <span className="flex flex-col leading-none">
        <span className="text-[1.0625rem] font-bold text-ink">Akış</span>
        {tagline ? <span className="mt-1 text-[0.6875rem] font-medium text-ink-3">{tagline}</span> : null}
      </span>
    </span>
  );
}

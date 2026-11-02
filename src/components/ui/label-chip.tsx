import type { Label } from "@/lib/types";

export function LabelChip({ label, compact = false }: { label: Label; compact?: boolean }) {
  return (
    <span className={`chip label-tone ${compact ? "h-5 px-1.5 text-[0.6875rem]" : ""}`} data-color={label.color}>
      <span className="size-1.5 rounded-full bg-[var(--tone-dot)]" aria-hidden />
      {label.name}
    </span>
  );
}

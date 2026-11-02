import type { Priority } from "@/lib/types";

const FILLED: Record<Exclude<Priority, "urgent">, number> = { high: 3, medium: 2, low: 1 };

/** Signal-bar glyph; urgent gets a filled alert square. Always paired with a text label for screen readers. */
export function PriorityIcon({ priority, className = "size-4" }: { priority: Priority; className?: string }) {
  if (priority === "urgent") {
    return (
      <svg viewBox="0 0 16 16" className={`${className} text-danger`} aria-hidden>
        <rect x="1.5" y="1.5" width="13" height="13" rx="3.5" fill="currentColor" />
        <rect x="7.1" y="4" width="1.8" height="5.2" rx="0.9" fill="var(--surface)" />
        <circle cx="8" cy="11.4" r="1.05" fill="var(--surface)" />
      </svg>
    );
  }
  const filled = FILLED[priority];
  const tone = priority === "high" ? "text-warn" : "text-ink-2";
  return (
    <svg viewBox="0 0 16 16" className={`${className} ${tone}`} aria-hidden>
      {[0, 1, 2].map((index) => (
        <rect
          key={index}
          x={2 + index * 4.5}
          y={10 - index * 3.5}
          width="3"
          height={4 + index * 3.5}
          rx="1"
          fill="currentColor"
          opacity={index < filled ? 1 : 0.25}
        />
      ))}
    </svg>
  );
}

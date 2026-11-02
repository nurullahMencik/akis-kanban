import type { CSSProperties } from "react";
import { initials } from "@/lib/text";
import type { Member } from "@/lib/types";

const SIZES = { xs: "size-[1.375rem] text-[0.5625rem]", sm: "size-7 text-[0.625rem]", md: "size-8 text-xs" } as const;

export function Avatar({ member, size = "sm", ring = false }: { member: Member; size?: keyof typeof SIZES; ring?: boolean }) {
  return (
    <span
      title={member.name}
      className={`inline-flex shrink-0 select-none items-center justify-center rounded-full font-bold tracking-tight ${SIZES[size]} ${
        ring ? "ring-2 ring-surface" : ""
      } bg-[hsl(var(--h)_48%_86%)] text-[hsl(var(--h)_62%_24%)] dark:bg-[hsl(var(--h)_32%_30%)] dark:text-[hsl(var(--h)_70%_88%)]`}
      style={{ "--h": member.hue } as CSSProperties}
      aria-hidden
    >
      {initials(member.name)}
    </span>
  );
}

export function AvatarStack({ members, max = 3, size = "sm" }: { members: Member[]; max?: number; size?: keyof typeof SIZES }) {
  const shown = members.slice(0, max);
  const rest = members.length - shown.length;
  return (
    <span className="flex -space-x-1" aria-hidden>
      {shown.map((member) => (
        <Avatar key={member.id} member={member} size={size} ring />
      ))}
      {rest > 0 ? (
        <span className={`inline-flex items-center justify-center rounded-full bg-sunken font-semibold text-ink-2 ring-2 ring-surface ${SIZES[size]}`}>
          +{rest}
        </span>
      ) : null}
    </span>
  );
}

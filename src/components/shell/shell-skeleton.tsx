import { tr } from "@/lib/i18n/messages";
import { Brand } from "./brand";

/** Static first paint (prerendered HTML) shown until the client reads IndexedDB. */
export function ShellSkeleton() {
  return (
    <div className="flex h-dvh overflow-hidden" aria-busy="true">
      <aside className="hidden w-60 shrink-0 flex-col gap-5 border-e border-line px-4.5 py-4 lg:flex">
        <Brand tagline={tr["app.tagline"]} />
        <div className="h-9 rounded-lg border border-line bg-surface" />
        <div className="flex flex-col gap-2">
          <div className="h-8 rounded-lg bg-sunken" />
          <div className="h-8 rounded-lg bg-sunken/60" />
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center border-b border-line px-3 lg:hidden">
          <span className="ms-12">
            <Brand />
          </span>
        </header>
        <BoardSkeleton />
      </div>
    </div>
  );
}

export function BoardSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col" aria-hidden>
      <div className="border-b border-line px-4 py-4 lg:px-6">
        <div className="h-6 w-72 max-w-full rounded-md bg-sunken" />
        <div className="mt-4 flex gap-2">
          <div className="h-9 w-56 rounded-lg bg-sunken" />
          <div className="h-9 w-24 rounded-lg bg-sunken" />
          <div className="h-9 w-24 rounded-lg bg-sunken" />
        </div>
      </div>
      <div className="flex min-h-0 flex-1 gap-3 overflow-hidden p-4 lg:px-6">
        {[6, 4, 5, 3, 4].map((cards, column) => (
          <div key={column} className="flex w-[17.5rem] shrink-0 flex-col gap-2 rounded-2xl bg-sunken p-2.5 sm:w-auto sm:min-w-60 sm:flex-1">
            <div className="mb-1 h-5 w-28 rounded bg-hover" />
            {Array.from({ length: cards }, (_, index) => (
              <div key={index} className="h-24 rounded-xl bg-surface/70" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

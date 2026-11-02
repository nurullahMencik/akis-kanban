"use client";

import { Dialog } from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n/use-i18n";
import type { MessageKey } from "@/lib/i18n/messages";
import { useUi } from "@/lib/store/ui-store";
import { useModKey } from "@/lib/use-platform";

export function ShortcutsDialog() {
  const { t } = useI18n();
  const open = useUi((state) => state.shortcutsOpen);
  const setOpen = useUi((state) => state.setShortcutsOpen);
  const mod = useModKey();

  const groups: { title: MessageKey; rows: [string[], MessageKey][] }[] = [
    {
      title: "shortcuts.general",
      rows: [
        [[mod, "K"], "shortcuts.palette"],
        [["N"], "shortcuts.newCard"],
        [["/"], "shortcuts.search"],
        [["?"], "shortcuts.help"],
        [[mod, "Z"], "shortcuts.undo"],
        [[mod, "Shift", "Z"], "shortcuts.redo"],
        [["Esc"], "shortcuts.close"],
      ],
    },
    {
      title: "shortcuts.cards",
      rows: [
        [["Enter"], "shortcuts.openCard"],
        [["Space"], "shortcuts.pickUp"],
        [["←", "↑", "↓", "→"], "shortcuts.move"],
        [["Esc"], "shortcuts.cancelDrag"],
      ],
    },
  ];

  return (
    <Dialog open={open} onClose={() => setOpen(false)} title={t("shortcuts.title")} testId="shortcuts-dialog">
      <div className="grid gap-6 overflow-y-auto px-5 py-4 sm:grid-cols-2">
        {groups.map((group) => (
          <section key={group.title}>
            <h3 className="mb-2 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-ink-3">{t(group.title)}</h3>
            <dl className="flex flex-col gap-2">
              {group.rows.map(([keys, label]) => (
                <div key={label} className="flex items-center justify-between gap-3 text-sm">
                  <dt className="text-ink-2">{t(label)}</dt>
                  <dd className="flex shrink-0 gap-1">
                    {keys.map((key) => (
                      <kbd key={key} className="kbd">
                        {key}
                      </kbd>
                    ))}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </Dialog>
  );
}

import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { createSampleData } from "@/lib/seed/sample-data";
import { createKanbanStore } from "@/lib/store/kanban-store";
import { createDexiePersistence } from "./dexie-persistence";

const NOW = new Date(2026, 10, 4, 14, 30).getTime();

describe("Dexie persistence", () => {
  it("round-trips the full dataset", async () => {
    const persistence = createDexiePersistence("roundtrip");
    const data = createSampleData(NOW);
    await persistence.replaceAll(data);
    expect(await persistence.load()).toEqual(data);
  });

  it("writes only touched rows on commit and survives a reload", async () => {
    const name = "incremental";
    const store = createKanbanStore({ persistence: createDexiePersistence(name), sample: createSampleData, now: () => NOW });
    const { actions } = store.getState();
    await actions.init();
    await actions.flush();

    const cardId = actions.createCard({ boardId: "mobil-v2", title: "Hesaplar arası virman" })!;
    actions.moveCard("mobil-v2-27", "mobil-v2-review", null);
    actions.deleteCard("mobil-v2-45");
    await actions.flush();

    const reloaded = createKanbanStore({ persistence: createDexiePersistence(name) });
    await reloaded.getState().actions.init();
    const data = reloaded.getState().data;
    expect(data).toEqual(store.getState().data);
    expect(data.cards[cardId]?.title).toBe("Hesaplar arası virman");
    expect(data.cards["mobil-v2-27"]?.columnId).toBe("mobil-v2-review");
    expect(data.cards["mobil-v2-45"]).toBeUndefined();
  });
});

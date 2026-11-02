import Dexie, { type Table } from "dexie";
import type { Patch } from "immer";
import type { Persistence } from "@/lib/store/kanban-store";
import type { EntityTable, KanbanData } from "@/lib/types";
import { ENTITY_TABLES, emptyData } from "@/lib/types";

type Row = { id: string };

class AkisDatabase extends Dexie {
  constructor(name: string) {
    super(name);
    this.version(1).stores({
      boards: "id",
      columns: "id, boardId",
      cards: "id, boardId, columnId",
      labels: "id, boardId",
      members: "id",
      activities: "id, boardId, cardId, at",
    });
  }

  entity(name: EntityTable): Table<Row, string> {
    return this.table(name);
  }
}

function isEntityTable(value: unknown): value is EntityTable {
  return typeof value === "string" && (ENTITY_TABLES as readonly string[]).includes(value);
}

/**
 * IndexedDB persistence. Instead of re-writing the whole dataset on every change,
 * it inspects the immer patches of a commit and only writes the touched rows.
 */
export function createDexiePersistence(name = "akis-kanban"): Persistence {
  const db = new AkisDatabase(name);

  return {
    async load() {
      const rows = await Promise.all(ENTITY_TABLES.map((table) => db.entity(table).toArray()));
      const data = emptyData() as unknown as Record<EntityTable, Record<string, Row>>;
      ENTITY_TABLES.forEach((table, index) => {
        for (const row of rows[index] ?? []) data[table][row.id] = row;
      });
      return data as unknown as KanbanData;
    },

    async write(patches: readonly Patch[], next: KanbanData) {
      const touched = new Map<EntityTable, Set<string> | "all">();
      for (const patch of patches) {
        const [table, id] = patch.path;
        if (!isEntityTable(table)) continue;
        if (id === undefined) {
          touched.set(table, "all");
          continue;
        }
        const ids = touched.get(table);
        if (ids === "all") continue;
        if (ids) ids.add(String(id));
        else touched.set(table, new Set([String(id)]));
      }
      if (touched.size === 0) return;

      const tables = [...touched.keys()].map((table) => db.entity(table));
      await db.transaction("rw", tables, async () => {
        for (const [table, ids] of touched) {
          const store = db.entity(table);
          const source = next[table] as Record<string, Row>;
          if (ids === "all") {
            await store.clear();
            await store.bulkPut(Object.values(source));
            continue;
          }
          const puts: Row[] = [];
          const deletes: string[] = [];
          for (const id of ids) {
            const row = source[id];
            if (row) puts.push(row);
            else deletes.push(id);
          }
          if (puts.length) await store.bulkPut(puts);
          if (deletes.length) await store.bulkDelete(deletes);
        }
      });
    },

    async replaceAll(data: KanbanData) {
      const tables = ENTITY_TABLES.map((table) => db.entity(table));
      await db.transaction("rw", tables, async () => {
        for (const table of ENTITY_TABLES) {
          const store = db.entity(table);
          await store.clear();
          await store.bulkPut(Object.values(data[table] as Record<string, Row>));
        }
      });
    },
  };
}

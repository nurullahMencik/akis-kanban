import { describe, expect, it } from "vitest";
import { boardMetrics } from "@/lib/metrics";
import { transitionsByCard } from "@/lib/metrics/transitions";
import { createSampleData } from "./sample-data";

const NOW = new Date(2026, 10, 4, 14, 30).getTime(); // a Wednesday afternoon

describe("sample data", () => {
  it("is deterministic for the same moment", () => {
    expect(createSampleData(NOW)).toEqual(createSampleData(NOW));
  });

  it("contains the two demo boards with the expected size", () => {
    const data = createSampleData(NOW);
    const count = (boardId: string) => Object.values(data.cards).filter((card) => card.boardId === boardId).length;
    expect(data.boards["mobil-v2"]?.name).toBe("Mobil Bankacılık Uygulaması v2");
    expect(data.boards["yaz-kampanyasi"]?.name).toBe("Yaz Kampanyası");
    expect(count("mobil-v2")).toBe(45);
    expect(count("yaz-kampanyasi")).toBe(12);
  });

  it("keeps the event log consistent with where every card sits now", () => {
    const data = createSampleData(NOW);
    const history = transitionsByCard(Object.values(data.activities));
    for (const card of Object.values(data.cards)) {
      const transitions = history.get(card.id) ?? [];
      expect(transitions.length).toBeGreaterThan(0);
      expect(transitions.at(-1)?.columnId).toBe(card.columnId);
      expect(data.columns[card.columnId]?.cardIds).toContain(card.id);
      for (let i = 1; i < transitions.length; i++) {
        expect(transitions[i]!.at).toBeGreaterThan(transitions[i - 1]!.at);
      }
    }
    for (const activity of Object.values(data.activities)) {
      expect(activity.at).toBeLessThanOrEqual(NOW);
      expect(activity.at).toBeGreaterThanOrEqual(data.boards[activity.boardId]!.createdAt);
    }
  });

  it("spans six weeks of history and produces believable metrics", () => {
    const metrics = boardMetrics(createSampleData(NOW), "mobil-v2", NOW)!;
    expect(metrics.cfd).toHaveLength(42);
    expect(metrics.cycleTimes).toHaveLength(22);
    expect(metrics.percentiles.p50).toBeGreaterThan(1);
    expect(metrics.percentiles.p95).toBeLessThan(14);
    expect(metrics.throughput.reduce((sum, week) => sum + week.count, 0)).toBeGreaterThan(15);
    expect(metrics.kpis.activeWip).toBe(9);
    expect(metrics.kpis.overdue).toBeGreaterThanOrEqual(2);
    const burndown = metrics.burndown!;
    expect(burndown.totalPoints).toBeGreaterThan(30);
    const actual = burndown.points.filter((point) => point.remaining !== null);
    expect(actual.at(-1)!.remaining).toBeLessThan(burndown.totalPoints);
  });

  it("intentionally exceeds the WIP limit of the in-progress column", () => {
    const data = createSampleData(NOW);
    const doing = data.columns["mobil-v2-doing"]!;
    expect(doing.cardIds.length).toBeGreaterThan(doing.wipLimit!);
  });
});

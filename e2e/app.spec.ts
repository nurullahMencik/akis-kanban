import { expect, test } from "@playwright/test";
import { BOARD, column, openBoard } from "./fixtures";

test("creates a card from the command palette", async ({ page }) => {
  await openBoard(page);
  await page.keyboard.press("Control+k");
  const palette = page.getByTestId("command-palette");
  const input = palette.getByRole("combobox");
  await expect(input).toBeFocused();
  await input.fill("Hesaplar arası virman ekranı");
  await palette.getByRole("option", { name: /Kart oluştur: “Hesaplar arası virman ekranı”/ }).click();

  await expect(palette).toBeHidden();
  await expect(page.getByTestId("card-drawer").getByTestId("card-title-input")).toHaveValue("Hesaplar arası virman ekranı");
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("card-drawer")).toBeHidden();
  const created = column(page, "todo").getByTestId("card").first();
  await expect(created).toContainText("MB-46");
  await expect(created).toContainText("Hesaplar arası virman ekranı");
});

test("palette searches cards, switches theme and language", async ({ page }) => {
  await openBoard(page);
  await page.keyboard.press("Control+k");
  const palette = page.getByTestId("command-palette");
  await palette.getByRole("combobox").fill("biyometrik");
  await palette.getByRole("option", { name: /MB-27/ }).click();
  await expect(page).toHaveURL(/card=mobil-v2-27/);
  const drawer = page.getByTestId("card-drawer");
  await expect(drawer).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();

  await page.keyboard.press("Control+k");
  await palette.getByRole("combobox").fill("koyu");
  await palette.getByRole("option", { name: "Tema: Koyu" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  await page.keyboard.press("Control+k");
  await palette.getByRole("combobox").fill("english");
  await palette.getByRole("option", { name: /English/ }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("button", { name: "New card" }).first()).toBeVisible();
});

test("renders the analytics charts from move events", async ({ page }) => {
  await page.goto(`./analytics/?board=${BOARD}`);
  await expect(page.getByRole("heading", { name: "Analitik", level: 1 })).toBeVisible();
  for (const id of ["kpi-wip", "kpi-cycle", "kpi-done", "kpi-overdue"]) {
    await expect(page.getByTestId(`${id}-value`)).not.toBeEmpty();
  }
  await expect(page.getByTestId("kpi-wip-value")).toHaveText("9");
  await expect(page.getByTestId("kpi-overdue-value")).toHaveText("3");

  // Charts mount as they scroll into view.
  const cfd = page.getByTestId("chart-cfd");
  await expect(cfd.locator(".recharts-area")).toHaveCount(5);
  const cycle = page.getByTestId("chart-cycle");
  await cycle.scrollIntoViewIfNeeded();
  await expect(cycle.locator(".recharts-scatter-symbol")).toHaveCount(22);
  await expect(cycle.locator(".recharts-reference-line")).toHaveCount(3);
  const throughput = page.getByTestId("chart-throughput");
  await throughput.scrollIntoViewIfNeeded();
  await expect(throughput.locator(".recharts-bar-rectangle")).toHaveCount(6);
  const burndown = page.getByTestId("chart-burndown");
  await burndown.scrollIntoViewIfNeeded();
  await expect(burndown.locator(".recharts-line")).toHaveCount(2);

  // Every chart also exposes its numbers as a table.
  await cfd.getByText("Veri tablosu").click();
  await expect(cfd.locator("table tbody tr")).toHaveCount(42);
});

test("persists changes after a reload and supports undo/redo", async ({ page }) => {
  const first = "Kalıcılık kontrolü: hesap kapama akışı";
  const second = "Geri alınacak kart: kampanya bildirimi";
  await openBoard(page);

  await page.keyboard.press("n");
  const dialog = page.getByTestId("create-card-dialog");
  await expect(dialog.getByRole("textbox")).toBeFocused();
  await dialog.getByRole("textbox").fill(first);
  await dialog.getByRole("button", { name: "Kartı oluştur" }).click();
  await expect(page.getByText(first)).toBeVisible();

  await page.reload();
  await expect(page.getByText(first)).toBeVisible();

  // Undo / redo cover every change, and the undone state is what gets persisted.
  await page.keyboard.press("n");
  await dialog.getByRole("textbox").fill(second);
  await dialog.getByRole("button", { name: "Kartı oluştur" }).click();
  await expect(page.getByText(second)).toBeVisible();
  await page.keyboard.press("Control+z");
  await expect(page.getByText(second)).toHaveCount(0);
  await expect(page.getByTestId("toast").last()).toContainText("Geri alındı: kart oluşturma");
  await page.keyboard.press("Control+Shift+z");
  await expect(page.getByText(second)).toBeVisible();
  await page.keyboard.press("Control+z");
  await expect(page.getByText(second)).toHaveCount(0);

  await page.reload();
  await expect(page.getByText(first)).toBeVisible();
  await expect(page.getByText(second)).toHaveCount(0);
});

test("shows the keyboard shortcut help with ?", async ({ page }) => {
  await openBoard(page);
  await page.keyboard.press("?");
  await expect(page.getByTestId("shortcuts-dialog")).toBeVisible();
  await expect(page.getByTestId("shortcuts-dialog")).toContainText("Komut paleti");
});

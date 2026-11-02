import { expect, test } from "@playwright/test";
import { BOARD, card, cardsIn, column, openBoard } from "./fixtures";

test.describe("board", () => {
  test("moves a card to another column with the mouse", async ({ page }) => {
    await openBoard(page);
    const source = card(page, 38); // "iOS widget" in Backlog
    await expect(column(page, "backlog").getByTestId("card").first()).toHaveAttribute("data-card-id", `${BOARD}-38`);

    const from = await source.boundingBox();
    const target = await column(page, "todo").getByTestId("card").nth(1).boundingBox();
    if (!from || !target) throw new Error("missing geometry");

    await page.mouse.move(from.x + from.width / 2, from.y + 24);
    await page.mouse.down();
    await page.mouse.move(from.x + from.width / 2 + 20, from.y + 30, { steps: 4 });
    await page.mouse.move(target.x + target.width / 2, target.y + 12, { steps: 20 });
    await page.mouse.up();

    await expect(column(page, "todo").locator(`[data-card-id="${BOARD}-38"]`)).toBeVisible();
    await expect(column(page, "backlog").locator(`[data-card-id="${BOARD}-38"]`)).toHaveCount(0);

    // The move is recorded in the card's activity log.
    await card(page, 38).click();
    await expect(page.getByTestId("activity-feed").locator("li").first()).toContainText("Backlog → Yapılacak");
  });

  test("moves a card with the keyboard and announces it", async ({ page }) => {
    await openBoard(page);
    const moving = card(page, 32); // first card in "Yapılacak"
    await moving.focus();
    await page.keyboard.press("Space");
    await expect(page.locator("#DndLiveRegion-0, [id^='DndLiveRegion']").first()).toContainText("alındı");
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(250);
    await page.keyboard.press("Space");

    await expect(column(page, "doing").locator(`[data-card-id="${BOARD}-32"]`)).toBeVisible();
    await expect(column(page, "todo").locator(`[data-card-id="${BOARD}-32"]`)).toHaveCount(0);
    await expect(page.locator("[id^='DndLiveRegion']").first()).toContainText("Devam Eden sütununa bırakıldı");

    // Reordering inside a column with ↓ works too.
    const doingBefore = await cardsIn(column(page, "doing"));
    await card(page, 32).focus();
    await page.keyboard.press("Space");
    await page.waitForTimeout(150);
    await page.keyboard.press("ArrowDown");
    await page.waitForTimeout(250);
    await page.keyboard.press("Space");
    await expect.poll(() => cardsIn(column(page, "doing"))).not.toEqual(doingBefore);
  });

  test("Enter opens the card drawer with a deep link and Escape closes it", async ({ page }) => {
    await openBoard(page);
    await card(page, 27).focus();
    await page.keyboard.press("Enter");
    const drawer = page.getByTestId("card-drawer");
    await expect(drawer).toBeVisible();
    await expect(page).toHaveURL(/card=mobil-v2-27/);
    await expect(drawer.getByTestId("card-title-input")).toHaveValue("Biyometrik giriş için iOS FaceID entegrasyonu");
    await page.keyboard.press("Escape");
    await expect(drawer).toBeHidden();
    await expect(page).not.toHaveURL(/card=/);

    await page.goto(`./?board=${BOARD}&card=${BOARD}-23`);
    await expect(page.getByTestId("card-drawer").getByTestId("card-title-input")).toHaveValue("FAST ile anlık para transferi akışı");
  });

  test("highlights the exceeded WIP limit", async ({ page }) => {
    await openBoard(page);
    await expect(column(page, "doing")).toHaveAttribute("data-wip-exceeded", "true");
    await expect(column(page, "doing").getByTestId("wip-warning")).toContainText("WIP limiti aşıldı: 5/4");
    await expect(column(page, "todo")).not.toHaveAttribute("data-wip-exceeded", "true");
  });

  test("keeps filters in the URL", async ({ page }) => {
    await openBoard(page);
    await page.keyboard.press("/");
    await expect(page.getByTestId("board-search")).toBeFocused();
    await page.keyboard.type("faceid");
    await expect(page).toHaveURL(/q=faceid/);
    await expect(page.getByTestId("card")).toHaveCount(1);

    await page.getByRole("radio", { name: "Gecikmiş" }).click();
    await expect(page).toHaveURL(/due=overdue/);
    await page.getByTestId("board-search").fill("");
    await expect(page.getByTestId("filter-count")).toHaveText("3/45 kart");

    await page.reload();
    await expect(page.getByTestId("filter-count")).toHaveText("3/45 kart");
    await expect(page.getByRole("radio", { name: "Gecikmiş" })).toHaveAttribute("aria-checked", "true");
  });

  test("has no horizontal page scroll at 375px", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await openBoard(page);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    await page.goto(`./analytics/?board=${BOARD}`);
    await expect(page.getByTestId("chart-cfd")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  });
});

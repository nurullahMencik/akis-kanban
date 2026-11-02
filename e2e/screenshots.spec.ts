import { expect, test, type Page } from "@playwright/test";
import { BOARD, openBoard } from "./fixtures";

const DIR = "docs/screenshots";
const DESKTOP = { width: 1600, height: 1000 };

test.use({ viewport: DESKTOP, deviceScaleFactor: 1, colorScheme: "light" });

/** Park the pointer where nothing reacts to hover, wait for fonts, then capture. */
async function capture(page: Page, name: string) {
  await page.mouse.move(DESKTOP.width - 2, 2);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${DIR}/${name}.png`, animations: "disabled", caret: "hide" });
}

test("01 hero: full board", async ({ page }) => {
  await openBoard(page);
  await capture(page, "01-hero");
});

test("02 card detail drawer", async ({ page }) => {
  await page.goto(`./?board=${BOARD}&card=${BOARD}-27`);
  await expect(page.getByTestId("card-drawer").getByTestId("activity-feed")).toBeVisible();
  await capture(page, "02-card-detail");
});

test("03 analytics (dark theme)", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto(`./analytics/?board=${BOARD}`);
  await expect(page.getByTestId("chart-cfd").locator(".recharts-area")).toHaveCount(5);
  await expect(page.getByTestId("chart-cycle").locator(".recharts-scatter-symbol").first()).toBeVisible();
  await capture(page, "03-analytics");
});

test("04 command palette", async ({ page }) => {
  await openBoard(page);
  await page.keyboard.press("Control+k");
  const input = page.getByTestId("command-palette").getByRole("combobox");
  await expect(input).toBeFocused();
  await input.fill("limit");
  await expect(page.getByTestId("command-palette").getByRole("option")).not.toHaveCount(0);
  await capture(page, "04-command-palette");
});

test("05 mobile board", async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
    locale: "tr-TR",
    timezoneId: "Europe/Istanbul",
    colorScheme: "light",
  });
  const page = await context.newPage();
  await page.goto(`http://localhost:5302/akis-kanban/?board=${BOARD}`);
  await expect(page.getByTestId("card").first()).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${DIR}/05-mobile.png`, animations: "disabled", caret: "hide" });
  await context.close();
});

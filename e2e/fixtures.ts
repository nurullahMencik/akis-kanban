import { expect, type Locator, type Page } from "@playwright/test";

export const BOARD = "mobil-v2";

export const column = (page: Page, stage: string) => page.locator(`[data-testid="column"][data-column-id="${BOARD}-${stage}"]`);
export const card = (page: Page, number: number) => page.locator(`[data-testid="card"][data-card-id="${BOARD}-${number}"]`);

/** Opens the demo board and waits until the sample data has been loaded from IndexedDB. */
export async function openBoard(page: Page, query = "") {
  await page.goto(`./?board=${BOARD}${query}`);
  await expect(page.getByTestId("board-title")).toHaveText("Mobil Bankacılık Uygulaması v2");
  await expect(page.getByTestId("card").first()).toBeVisible();
}

export async function cardsIn(columnLocator: Locator): Promise<string[]> {
  return columnLocator.getByTestId("card").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-card-id") ?? ""));
}

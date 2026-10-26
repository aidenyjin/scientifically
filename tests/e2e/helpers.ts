import { expect, type Page } from "@playwright/test";

/** Start as a guest through onboarding and land on /learn. */
export async function startAsGuest(page: Page) {
  await page.goto("/welcome");
  await page.getByRole("link", { name: "Get started" }).click();
  await page.waitForURL("**/onboarding");
  // Choose the first course if a picker is shown, then a goal.
  const continueBtn = page.getByRole("button", { name: "Continue" });
  if (await continueBtn.isVisible()) await continueBtn.click();
  await page.getByRole("radio", { name: /Regular/ }).click();
  await page.getByRole("button", { name: "Start learning" }).click();
  await page.waitForURL("**/learn");
  await page.waitForLoadState("networkidle");
}

/** From /learn, press Enter (the start-next-lesson shortcut) and wait for the lesson. */
export async function startNextLesson(page: Page) {
  await page.waitForLoadState("networkidle");
  await expect(page.locator("[data-current]")).toBeVisible();
  await expect(async () => {
    await page.keyboard.press("Enter");
    await page.waitForURL("**/lesson/**", { timeout: 2_000 });
  }).toPass({ timeout: 20_000 });
  await page.waitForFunction(() => "__sci" in window);
}

type Sci = { status(): string | null; exercise(): { type: string } | null; answerCorrectly(): void };

/** Answer every exercise correctly via the test hook until the lesson completes. */
export async function playLessonCorrectly(page: Page) {
  await page.waitForFunction(() => "__sci" in window);
  for (let i = 0; i < 60; i++) {
    const status = await page.evaluate(() => (window as unknown as { __sci: Sci }).__sci.status());
    if (status === "complete") return;
    if (status === "answering") {
      await page.evaluate(() => (window as unknown as { __sci: Sci }).__sci.answerCorrectly());
      await page.keyboard.press("Enter");
    } else if (status === "correct" || status === "incorrect") {
      await page.keyboard.press("Enter");
    }
    await page.waitForTimeout(80);
  }
  throw new Error("Lesson did not complete");
}

/** A stat in the visible stat bar (there is a second, hidden one for narrow screens). */
export function stat(page: Page, label: string | RegExp) {
  return page.getByLabel(label).filter({ visible: true }).first();
}

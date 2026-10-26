import { expect, test } from "@playwright/test";
import { startAsGuest, startNextLesson, stat } from "./helpers";

test("multiple choice is playable with the keyboard alone", async ({ page }) => {
  await startAsGuest(page);
  await startNextLesson(page);

  // First exercise is an info card: Enter continues.
  await page.keyboard.press("Enter");
  await expect(page.getByRole("radiogroup", { name: "Answer options" })).toBeVisible();

  // Find the shortcut number shown on the correct option.
  const correct = await page.evaluate(() => {
    const ex = (window as unknown as { __sci: { exercise(): { options: string[]; answerIndex: number } } }).__sci.exercise();
    return ex.options[ex.answerIndex];
  });
  const option = page.getByRole("radio", { name: new RegExp(correct.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")) });
  const key = (await option.locator("kbd").innerText()).trim();
  await page.keyboard.press(key);
  await expect(option).toHaveAttribute("aria-checked", "true");
  await page.keyboard.press("Enter");
  await expect(page.locator("footer").getByText(/Nicely done|Great work|Correct!|Excellent|You got it|Spot on/)).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("radiogroup")).toBeVisible();
});

test("running out of hearts shows the refill screen and gates lessons", async ({ page }) => {
  await startAsGuest(page);
  await startNextLesson(page);
  await page.keyboard.press("Enter"); // info card
  for (let i = 0; i < 5; i++) {
    await page.getByRole("button", { name: "Skip" }).click();
    await page.keyboard.press("Enter");
  }
  await expect(page.getByRole("dialog", { name: "Out of hearts" })).toBeVisible();
  await page.getByRole("button", { name: "No thanks" }).click();
  await page.waitForURL("**/learn");
  await expect(stat(page, "0 hearts")).toBeVisible();

  await page.waitForLoadState("networkidle");
  await expect(async () => {
    await page.keyboard.press("Enter");
    await page.waitForURL("**/practice?hearts=0", { timeout: 2_000 });
  }).toPass({ timeout: 20_000 });
  await expect(page.getByText(/out of hearts/i)).toBeVisible();
});

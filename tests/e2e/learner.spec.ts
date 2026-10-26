import { expect, test } from "@playwright/test";
import { playLessonCorrectly, startAsGuest, startNextLesson, stat } from "./helpers";

test("a new guest completes their first lesson and starts a streak", async ({ page }) => {
  await startAsGuest(page);
  await expect(page.getByText("Tour of the lab")).toBeVisible();

  // Enter starts the next lesson from the path.
  await startNextLesson(page);
  await playLessonCorrectly(page);

  await expect(page.getByRole("heading", { name: /Perfect lesson!|Lesson complete!/ })).toBeVisible();
  const continueBtn = page.getByRole("button", { name: "Continue" });
  await expect(continueBtn).toBeEnabled({ timeout: 15_000 }); // waits for the server save
  await continueBtn.click();
  await expect(page.getByText("day streak!")).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();

  await page.waitForURL("**/learn");
  await expect(stat(page, "1 day streak")).toBeVisible();
  await expect(page.getByRole("button", { name: /\(completed\)/ }).first()).toBeVisible();
});

test("the whole demo course — every question type — can be completed", async ({ page }) => {
  test.setTimeout(180_000);
  await startAsGuest(page);
  // Play every lesson in path order (each unlocks the next) until none is left.
  let played = 0;
  for (; played < 20; played++) {
    await page.goto("/learn");
    await page.waitForLoadState("networkidle");
    if ((await page.locator("[data-current]").count()) === 0) break;
    await startNextLesson(page);
    await playLessonCorrectly(page);
    await expect(page.getByRole("button", { name: "Continue" })).toBeEnabled({ timeout: 15_000 });
  }
  expect(played).toBeGreaterThanOrEqual(8);
  await page.goto("/profile");
  await expect(page.getByText("Lessons finished")).toBeVisible();
});

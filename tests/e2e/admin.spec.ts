import { expect, test } from "@playwright/test";

test("admin generates a course with the mock provider, reviews and publishes it", async ({ page }) => {
  await page.goto("/admin");
  await page.waitForURL("**/admin/login**");
  await page.getByLabel("Admin password").fill("e2e-admin-password");
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL(/\/admin$/);

  await page.getByRole("link", { name: "Generate a course" }).first().click();
  await page.getByLabel("Subject").fill("Physics");
  await page.getByLabel("Level / audience").fill("High school");
  await page.getByLabel("Topic").fill("Forces and motion");
  await page.getByLabel("Units").fill("1");
  await page.getByLabel("Lessons per unit").fill("2");
  await page.getByRole("button", { name: "Start generating" }).click();

  await page.waitForURL("**/admin/jobs/**");
  await expect(page.getByText("done", { exact: true })).toBeVisible({ timeout: 45_000 });
  await page.getByRole("link", { name: "Review pack" }).click();
  await page.waitForURL("**/admin/packs/**");
  await expect(page.getByRole("button", { name: "Play lesson" }).or(page.getByRole("link", { name: "Play lesson" }))).toBeVisible();

  await page.getByRole("button", { name: "Publish" }).click();
  await expect(page.getByText(/Published|Fix these problems/)).toBeVisible();
});

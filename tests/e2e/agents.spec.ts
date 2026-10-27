import { expect, test } from "@playwright/test";

test("admin creates an agent key; an agent uses it to publish a course, then the key is revoked", async ({
  page,
  request,
}) => {
  await page.goto("/admin/agents");
  await page.waitForURL("**/admin/login**");
  await page.getByLabel("Admin password").fill("e2e-admin-password");
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL("**/admin/agents");

  await page.getByLabel("Key name").fill("E2E agent");
  await page.getByRole("button", { name: "Create key" }).click();
  await expect(page.getByText("Key for “E2E agent” is ready")).toBeVisible();
  const key = (await page.locator("pre").first().textContent())?.trim() ?? "";
  expect(key).toMatch(/^sci_/);
  const auth = { Authorization: `Bearer ${key}` };

  // The agent reads the guide, then copies the seeded demo course into a new one and publishes it.
  expect((await request.get("/api/agent")).status()).toBe(401);
  const guide = await request.get("/api/agent", { headers: auth });
  expect(guide.ok()).toBe(true);
  expect(await guide.text()).toContain("# Writing courses for Scientifically");

  const demo = await (await request.get("/api/agent/packs/demo", { headers: auth })).json();
  const pack = { ...demo.pack, id: "agent-made", title: "Agent-made science course" };
  const created = await request.post("/api/agent/packs", { headers: auth, data: { pack } });
  expect(created.status()).toBe(201);
  expect(await created.json()).toMatchObject({ id: "agent-made", status: "draft", problems: [] });

  const published = await request.patch("/api/agent/packs/agent-made", {
    headers: auth,
    data: { status: "published" },
  });
  expect(await published.json()).toMatchObject({ status: "published" });

  // MCP clients use the same key in the connector URL.
  const mcp = await request.post(`/api/agent/mcp?key=${key}`, {
    headers: { Accept: "application/json, text/event-stream" },
    data: { jsonrpc: "2.0", id: 1, method: "tools/list" },
  });
  expect((await mcp.json()).result.tools.map((t: { name: string }) => t.name)).toContain(
    "create_pack",
  );

  await page.goto("/admin");
  await expect(page.getByRole("link", { name: "Agent-made science course" })).toBeVisible();

  await page.goto("/admin/agents");
  await page.getByRole("button", { name: "Revoke", exact: true }).click();
  await page.getByRole("button", { name: "Revoke key" }).click();
  await expect(page.getByText(/^Revoked /)).toBeVisible();
  expect((await request.get("/api/agent/packs", { headers: auth })).status()).toBe(401);
});

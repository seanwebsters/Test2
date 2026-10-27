import { expect, test } from "@playwright/test";

test("overview shows the composer, categories and seeded games", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Turn an idea into/ })).toBeVisible();
  await expect(page.getByRole("group", { name: "Category" }).getByRole("button")).toHaveCount(8);
  await expect(page.getByRole("heading", { name: "Apricus' Sunset Path" })).toBeVisible();
  await expect(page.getByText("Concept · not yet built").first()).toBeVisible();
});

test("generation is refused honestly without an API key", async ({ page, request }) => {
  const res = await request.post("/api/jobs", { data: { kind: "generate", prompt: "A calm puzzle on an island at sunset" } });
  expect(res.status()).toBe(503);
  await page.goto("/create");
  await expect(page.getByText(/Generation needs an Anthropic API key/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Generate game" })).toBeDisabled();
});

test("a seed game is playable inside the sandboxed preview", async ({ page }) => {
  await page.goto("/games/seed-sunset-path");
  const iframe = page.locator("iframe");
  await expect(iframe).toHaveAttribute("sandbox", "allow-scripts");
  const game = page.frameLocator("iframe");
  await game.getByRole("button", { name: "Begin" }).click();
  await expect(game.locator("#status")).toContainText("lit");
  const frame = page.frames().find((f) => f.url().includes("/play/"))!;
  // The sandbox has an opaque origin: it cannot read the studio's storage.
  expect(await frame.evaluate(() => { try { return String(window.localStorage.length); } catch { return "blocked"; } })).toBe("blocked");
  const before = await frame.evaluate(() => JSON.stringify((window as never as { __calmQA: { state(): unknown } }).__calmQA.state()));
  const a = await frame.evaluate(() => (window as never as { __calmQA: { next(): { x: number; y: number } } }).__calmQA.next());
  const box = (await iframe.boundingBox())!;
  await page.mouse.click(box.x + a.x, box.y + a.y);
  const after = await frame.evaluate(() => JSON.stringify((window as never as { __calmQA: { state(): unknown } }).__calmQA.state()));
  expect(after).not.toBe(before);
  // Studio controls reach the game.
  await page.getByRole("button", { name: "Pause" }).click();
  await expect(page.getByRole("button", { name: "Play" })).toBeVisible();
});

test("QA runs on demand and records a thumbnail", async ({ page }) => {
  await page.goto("/games/seed-breathe-flow");
  await page.getByRole("button", { name: "Run QA now" }).click();
  await expect(page.getByText("Passed every required check")).toBeVisible({ timeout: 60_000 });
  const res = await page.request.get("/api/games/seed-breathe-flow/thumbnail");
  expect(res.headers()["content-type"]).toBe("image/png");
});

test("library: duplicate, rename, export and delete", async ({ page }) => {
  await page.goto("/games");
  await page.getByRole("button", { name: "More actions for The Tidal Garden" }).click();
  await page.getByRole("menuitem", { name: "Duplicate" }).click();
  await expect(page.getByRole("heading", { name: "The Tidal Garden (copy)" })).toBeVisible();

  await page.getByRole("button", { name: "More actions for The Tidal Garden (copy)" }).click();
  await page.getByRole("menuitem", { name: "Rename" }).click();
  await page.getByLabel("Game name").fill("Harbour Garden");
  await page.getByRole("button", { name: "Save name" }).click();
  await expect(page.getByRole("heading", { name: "Harbour Garden" })).toBeVisible();

  const zip = await page.request.get("/api/games/seed-tidal-garden/export");
  expect(zip.headers()["content-type"]).toBe("application/zip");
  expect((await zip.body()).subarray(0, 2).toString()).toBe("PK");

  await page.getByRole("button", { name: "More actions for Harbour Garden" }).click();
  await page.getByRole("menuitem", { name: "Delete" }).click();
  await page.getByRole("button", { name: "Delete permanently" }).click();
  await expect(page.getByRole("heading", { name: "Harbour Garden" })).toHaveCount(0);
});

test("every studio page renders without errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const path of ["/agents", "/lab", "/styles", "/assets", "/analytics", "/settings"]) {
    await page.goto(path);
    await expect(page.locator("h1")).toBeVisible();
  }
  expect(errors).toEqual([]);
});

import { expect, test, type Page } from "@playwright/test";

test.setTimeout(300_000);

/** Clicks through any celebration overlays (mission, level, badges). */
async function dismissCelebrations(page: Page) {
  for (let i = 0; i < 8; i++) {
    const btn = page.getByRole("dialog").getByRole("button", { name: /^(Next|Keep going)$/ });
    try {
      await btn.first().waitFor({ state: "visible", timeout: i === 0 ? 10_000 : 1_500 });
    } catch {
      return;
    }
    await btn.first().click({ timeout: 5_000 }).catch(() => {});
    // Let the exit animation finish before looking for the next overlay.
    await page.waitForTimeout(700);
  }
}

/**
 * The core journey: sign up → onboarding → recommendation → choose path →
 * complete missions → earn XP → unlock a milestone → chat with the coach → view progress.
 */
test("a new user finds a direction and makes progress", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Not sure what you want to do?" })).toBeVisible();
  await page.getByRole("link", { name: /Find my direction/ }).click();

  await page.getByRole("button", { name: /Let's go/ }).click();
  await page.getByPlaceholder("e.g. Sam").fill("Jordan");
  await page.getByRole("button", { name: "At university" }).click();
  await page.getByRole("button", { name: "Continue" }).click();

  // Swipe deck: tap through all cards.
  for (let i = 0; i < 16; i++) {
    const btn = i % 3 === 0 ? page.getByRole("button", { name: "Love it" }) : i % 3 === 1 ? page.getByRole("button", { name: "Sounds good" }) : page.getByRole("button", { name: "Not for me" });
    await btn.click();
  }
  await page.getByRole("button", { name: "Continue" }).click();

  // What excites you.
  await page.getByRole("button", { name: /Art & drawing/ }).click();
  await page.getByRole("button", { name: /Design/ }).first().click();
  await page.getByRole("button", { name: "Continue" }).click();

  // This or that: six picks.
  for (let i = 0; i < 6; i++) await page.locator("button.aspect-\\[3\\/4\\]").first().click();
  await page.getByRole("button", { name: "Continue" }).click();

  await page.getByRole("button", { name: "Art & Design" }).click();
  await page.getByRole("button", { name: "Continue" }).click(); // subjects
  await page.getByRole("button", { name: "Continue" }).click(); // social
  await page.getByRole("button", { name: /Studio life/ }).click();
  await page.getByRole("button", { name: "Continue" }).click();

  // Values: 10 points are pre-spent as 2 each.
  await expect(page.getByText("Perfect — all 10 points spent!")).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Visual Design" }).click();
  await page.getByRole("button", { name: "Continue" }).click(); // skills
  await page.getByRole("button", { name: "Skip" }).click(); // considered
  await page.getByRole("button", { name: /Reveal my directions/ }).click();

  await expect(page.getByRole("heading", { name: "Your top three directions" })).toBeVisible();
  await expect(page.getByText(/% *$/).first()).toBeVisible();
  await page.getByRole("button", { name: "Commit to this path" }).first().click();

  // Sign up to save.
  const email = `jordan+${Date.now()}@example.com`;
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("super-secret-pw");
  await page.getByRole("button", { name: /Create account/ }).click();

  await page.waitForURL(/\/path/);
  await expect(page.getByText("Level 1").first()).toBeVisible();

  // Complete three level-1 missions and the quest.
  const level1 = await page.evaluate(() => Array.from(document.querySelectorAll('a[href*="/missions/"]')).map((a) => (a as HTMLAnchorElement).getAttribute("href")!));
  const missionLinks = [...new Set(level1.map((h) => h.split("?")[0]!))].filter((h) => /-1-\d$/.test(h));
  expect(missionLinks.length).toBeGreaterThanOrEqual(4);

  // The quest stays locked (no link) until three missions are done.
  const quest = missionLinks[0]!.replace(/-1-\d$/, "-1-5");
  const others = missionLinks.filter((h) => h !== quest).slice(0, 3);
  for (const href of others) {
    await page.goto(`${href}?from=path`);
    const steps = page.locator("ol button[aria-pressed]");
    const n = await steps.count();
    for (let i = 0; i < n; i++) await steps.nth(i).click();
    await page.getByRole("button", { name: "Complete mission" }).click();
    await expect(page.getByRole("dialog").getByText(/XP/).first()).toBeVisible();
    await dismissCelebrations(page);
  }

  await page.goto(`${quest}?from=path`);
  await page.locator("textarea").first().fill("I explained the role to a friend using a real campaign as the example.");
  await page.getByRole("button", { name: "Complete quest" }).click();
  await expect(page.getByText("Level 1 complete")).toBeVisible();
  await dismissCelebrations(page);

  // Coach.
  await page.goto("/coach");
  await page.getByLabel("Message Pip").fill("Help me make a plan");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByText(/4-week plan/)).toBeVisible();

  // Progress persists.
  await page.goto("/profile");
  await expect(page.getByText("Direction Passport")).toBeVisible();
  await expect(page.getByText("First Step").first()).toBeVisible();
  await page.goto("/path");
  await expect(page.getByRole("button", { name: /Level 2: .*0 of 5 missions done/ })).toBeVisible();
});

test("the demo account has a living dashboard and every nav item works", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Try the demo" }).click();
  await page.waitForURL(/\/home/);
  await expect(page.getByRole("heading", { name: "Hey Maya" })).toBeVisible();
  for (const [href, text] of [
    ["/discover", "Discover"],
    ["/path", "Creative Director"],
    ["/missions", "Missions"],
    ["/coach", "Pip, your coach"],
    ["/opportunities", "Opportunities"],
    ["/profile", "Direction Passport"],
    ["/challenge", "30-Day Discovery Challenge"],
    ["/recap", "Week of"],
    ["/plus", "Direction Plus"],
  ] as const) {
    await page.goto(href);
    await expect(page.locator("main").getByText(text).first()).toBeVisible();
  }
});

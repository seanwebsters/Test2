import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { jar, creativeAnswers, freshStore, req, viewer } from "./helpers";
import { POST as signup } from "@/app/api/auth/signup/route";
import { POST as signin } from "@/app/api/auth/signin/route";
import { POST as complete } from "@/app/api/missions/complete/route";
import { GET as today } from "@/app/api/today/route";
import { POST as bookmark } from "@/app/api/bookmarks/route";
import { POST as coach } from "@/app/api/coach/route";
import { PATCH as profilePatch } from "@/app/api/profile/route";
import { POST as checkout } from "@/app/api/billing/checkout/route";
import { POST as webhook } from "@/app/api/billing/webhook/route";
import { createSessionToken, SESSION_COOKIE, verifySessionToken } from "@/lib/server/session";
import { localStore, publicPassports } from "@/lib/server/context";
import { completeMission, loadState, saveBookmark, saveOnboarding, startPath, updateProfileSettings } from "@/lib/server/services";
import { verifyStripeSignature } from "@/lib/server/billing";
import crypto from "node:crypto";

beforeEach(() => {
  freshStore();
  jar.clear();
});

describe("authentication", () => {
  it("rejects unauthenticated requests to private APIs", async () => {
    expect((await today()).status).toBe(401);
    expect((await complete(req("/api/missions/complete", { missionId: "cd-1-1" }))).status).toBe(401);
    expect((await bookmark(req("/api/bookmarks", { opportunityId: "dir-ncs", status: "saved" }))).status).toBe(401);
    expect((await coach(req("/api/coach", { message: "hi" }))).status).toBe(401);
    expect((await profilePatch(req("/api/profile", { displayName: "x" }, "PATCH"))).status).toBe(401);
    expect((await checkout(req("/api/billing/checkout", {}))).status).toBe(401);
  });

  it("signs up, signs in and validates passwords", async () => {
    const res = await signup(req("/api/auth/signup", { email: "Sam@Example.com", password: "correct horse", onboarding: creativeAnswers(), startPath: "creative-director" }));
    expect(res.status).toBe(200);
    expect(jar.get(SESSION_COOKIE)).toBeTruthy();
    expect((await today()).status).toBe(200);
    jar.clear();
    expect((await signin(req("/api/auth/signin", { email: "sam@example.com", password: "wrong password" }))).status).toBe(401);
    expect((await signin(req("/api/auth/signin", { email: "sam@example.com", password: "correct horse" }))).status).toBe(200);
    expect((await signup(req("/api/auth/signup", { email: "sam@example.com", password: "another one" }))).status).toBe(409);
    expect((await signup(req("/api/auth/signup", { email: "new@example.com", password: "short" }))).status).toBe(400);
  });

  it("rejects tampered or expired session tokens", () => {
    const t = createSessionToken("user-a");
    expect(verifySessionToken(t)).toBe("user-a");
    const [uid, exp, sig] = t.split(".");
    const forged = `${Buffer.from("user-b").toString("base64url")}.${exp}.${sig}`;
    expect(verifySessionToken(forged)).toBeNull();
    expect(verifySessionToken(`${uid}.${exp}.AAAA`)).toBeNull();
    expect(verifySessionToken(t, Date.now() + 31 * 86400_000)).toBeNull();
  });

  it("blocks cross-origin state changes", async () => {
    jar.set(SESSION_COOKIE, createSessionToken("u1"));
    const r = new Request("http://localhost/api/missions/complete", { method: "POST", headers: { "content-type": "application/json", origin: "https://evil.example", host: "localhost" }, body: JSON.stringify({ missionId: "cd-1-1" }) });
    expect((await complete(r)).status).toBe(403);
  });
});

describe("data isolation", () => {
  it("one user's progress is never visible to another", async () => {
    const a = viewer();
    const b = viewer();
    for (const v of [a, b]) {
      await saveOnboarding(v, creativeAnswers());
      await startPath(v, "creative-director");
    }
    await completeMission(a, { missionId: "cd-1-1", evidence: "secret notes" });
    await saveBookmark(a, "dir-ncs", "applied");
    const sb = await loadState(b);
    expect(sb.completions).toHaveLength(0);
    expect(sb.bookmarks).toHaveLength(0);
    // B can still complete the same mission independently.
    await expect(completeMission(b, { missionId: "cd-1-1" })).resolves.toBeTruthy();
  });

  it("API calls act only on the signed-in user", async () => {
    const a = viewer();
    await saveOnboarding(a, creativeAnswers());
    await startPath(a, "creative-director");
    jar.set(SESSION_COOKIE, createSessionToken(a.userId));
    const r = await complete(req("/api/missions/complete", { missionId: "cd-1-2" }));
    expect(r.status).toBe(200);
    const other = viewer();
    expect((await loadState(other)).completions).toHaveLength(0);
    expect((await loadState(a)).completions).toHaveLength(1);
  });

  it("public passports are private by default and respect section toggles", async () => {
    const a = viewer();
    const p = await saveOnboarding(a, creativeAnswers());
    await startPath(a, "creative-director");
    await completeMission(a, { missionId: "cd-1-1", evidence: "private evidence" });
    expect(await publicPassports().findPublicProfile(p.handle)).toBeNull();
    await updateProfileSettings(a, { privacy: { passportPublic: true } });
    const pub = await publicPassports().findPublicProfile(p.handle);
    expect(pub?.profile.displayName).toBe("Alex");
    await localStore().savePassportItem(a.userId, { id: "x", kind: "experience", title: "Hidden job", organisation: "", startDate: null, endDate: null, description: "", url: null, isPublic: false, createdAt: new Date().toISOString() });
    const pub2 = await publicPassports().findPublicProfile(p.handle);
    expect(pub2?.passport.find((i) => i.title === "Hidden job")).toBeUndefined();
  });

  it("users cannot grant themselves Plus through profile updates", async () => {
    const a = viewer();
    await saveOnboarding(a, creativeAnswers());
    jar.set(SESSION_COOKIE, createSessionToken(a.userId));
    await profilePatch(req("/api/profile", { displayName: "Alex", plan: "plus" }, "PATCH"));
    expect((await loadState(a)).profile.plan).toBe("free");
  });
});

describe("billing", () => {
  it("mock checkout grants Plus and is clearly mock", async () => {
    const a = viewer();
    await saveOnboarding(a, creativeAnswers());
    jar.set(SESSION_COOKIE, createSessionToken(a.userId));
    const r = await checkout(req("/api/billing/checkout", {}));
    expect(await r.json()).toMatchObject({ mode: "mock", plan: "plus" });
    expect((await loadState(a)).profile).toMatchObject({ plan: "plus", planSource: "mock" });
  });

  it("verifies Stripe webhook signatures", async () => {
    const secret = "whsec_test";
    const payload = JSON.stringify({ type: "ping", data: { object: {} } });
    const t = Math.floor(Date.now() / 1000);
    const sig = crypto.createHmac("sha256", secret).update(`${t}.${payload}`).digest("hex");
    expect(verifyStripeSignature(payload, `t=${t},v1=${sig}`, secret)).toBe(true);
    expect(verifyStripeSignature(payload, `t=${t},v1=${"0".repeat(64)}`, secret)).toBe(false);
    expect(verifyStripeSignature(payload, `t=${t - 1000},v1=${sig}`, secret)).toBe(false);
    const res = await webhook(new Request("http://localhost/api/billing/webhook", { method: "POST", body: payload, headers: { "stripe-signature": "t=1,v1=bad" } }));
    expect(res.status).toBe(400);
  });
});

describe("coach limits", () => {
  it("enforces the free daily message limit and Plus-only modes", async () => {
    const a = viewer();
    await saveOnboarding(a, creativeAnswers());
    jar.set(SESSION_COOKIE, createSessionToken(a.userId));
    const locked = await coach(req("/api/coach", { message: "practice", mode: "interview" }));
    expect(locked.status).toBe(402);
    for (let i = 0; i < 10; i++) {
      await localStore().addCoachMessage(a.userId, { id: `m${i}`, role: "user", content: "hi", createdAt: new Date().toISOString(), provider: null });
    }
    const limited = await coach(req("/api/coach", { message: "one more" }));
    expect(limited.status).toBe(429);
  });

  it("streams an offline reply when no AI key is configured", async () => {
    const a = viewer();
    await saveOnboarding(a, creativeAnswers());
    jar.set(SESSION_COOKIE, createSessionToken(a.userId));
    const r = await coach(req("/api/coach", { message: "Can you review my CV?" }));
    expect(r.status).toBe(200);
    expect(r.headers.get("x-coach-provider")).toBe("offline");
    const text = await r.text();
    expect(text).toMatch(/CV/);
    const s = await localStore().listCoachMessages(a.userId, 10);
    expect(s.map((m) => m.role)).toEqual(["user", "assistant"]);
  });
});

describe("database security (migration)", () => {
  const sql = fs.readFileSync(path.join(__dirname, "../supabase/migrations/20261018000000_direction_init.sql"), "utf8");
  const tables = [...sql.matchAll(/create table public\.(\w+)/g)].map((m) => m[1]!);
  it("enables row-level security on every table", () => {
    expect(tables.length).toBeGreaterThanOrEqual(10);
    for (const t of tables) expect(sql).toContain(`alter table public.${t} enable row level security`);
  });
  it("scopes every policy to the signed-in user", () => {
    const policies = [...sql.matchAll(/create policy [^;]+;/g)].map((m) => m[0]);
    expect(policies.length).toBeGreaterThanOrEqual(tables.length);
    for (const p of policies) expect(p).toMatch(/auth\.uid\(\)/);
  });
  it("never lets users write their own subscription", () => {
    expect(sql).not.toMatch(/create policy[^;]+on public\.subscriptions for (all|insert|update)/);
  });
});

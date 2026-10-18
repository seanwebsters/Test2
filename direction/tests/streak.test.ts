import { describe, expect, it } from "vitest";
import { addDays } from "@/lib/engine/dates";
import { EMPTY_STREAK } from "@/lib/engine/model";
import { MAX_FREEZES, recordActivity, streakStatus } from "@/lib/engine/streak";

const D = "2026-10-01";

function run(days: string[]) {
  let s = { ...EMPTY_STREAK };
  const events = days.map((d) => {
    const e = recordActivity(s, d);
    s = e.state;
    return e;
  });
  return { s, events };
}

describe("streaks", () => {
  it("starts at 1 and extends on consecutive days", () => {
    const { s, events } = run([D, addDays(D, 1), addDays(D, 2)]);
    expect(events.map((e) => e.outcome)).toEqual(["started", "extended", "extended"]);
    expect(s.current).toBe(3);
    expect(s.longest).toBe(3);
  });

  it("ignores repeat activity on the same day", () => {
    const { s, events } = run([D, D, D]);
    expect(s.current).toBe(1);
    expect(events[1]!.outcome).toBe("same-day");
  });

  it("earns a freeze every 7 days, capped", () => {
    const days = Array.from({ length: 21 }, (_, i) => addDays(D, i));
    const { s, events } = run(days);
    expect(events[6]!.earnedFreeze).toBe(true);
    expect(s.freezes).toBe(MAX_FREEZES);
    expect(s.current).toBe(21);
  });

  it("uses a freeze to protect a missed day instead of punishing", () => {
    const days = Array.from({ length: 7 }, (_, i) => addDays(D, i));
    const { s } = run(days);
    expect(s.freezes).toBe(1);
    const e = recordActivity(s, addDays(D, 8)); // missed day 7
    expect(e.outcome).toBe("protected");
    expect(e.freezesUsed).toBe(1);
    expect(e.state.current).toBe(8);
    expect(e.state.frozenDays).toContain(addDays(D, 7));
  });

  it("restarts after a long gap but keeps the longest streak", () => {
    const { s } = run([D, addDays(D, 1), addDays(D, 2)]);
    const e = recordActivity(s, addDays(D, 10));
    expect(e.outcome).toBe("restarted");
    expect(e.state.current).toBe(1);
    expect(e.state.longest).toBe(3);
  });

  it("reports status without mutating", () => {
    const { s } = run([D, addDays(D, 1)]);
    expect(streakStatus(s, addDays(D, 1))).toMatchObject({ current: 2, alive: true, doneToday: true });
    expect(streakStatus(s, addDays(D, 2))).toMatchObject({ current: 2, alive: true, atRisk: true, doneToday: false });
    expect(streakStatus(s, addDays(D, 4))).toMatchObject({ current: 0, alive: false });
  });
});
